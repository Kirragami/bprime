package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"sort"

	"bprime/internal/models"
)

var (
	ErrInvalidMeasuring = errors.New("invalid measuring")
	ErrInvalidMode      = errors.New("invalid mode")
)

type MeasuringRepository struct {
	db *sql.DB
}

func NewMeasuringRepository(db *sql.DB) *MeasuringRepository {
	return &MeasuringRepository{db: db}
}

func (r *MeasuringRepository) Create(ctx context.Context, userID int64, mode string, attempts []models.Attempt) (models.Measuring, error) {
	if mode != "solo" && mode != "multi" {
		return models.Measuring{}, ErrInvalidMode
	}
	if len(attempts) != 5 {
		return models.Measuring{}, ErrInvalidMeasuring
	}

	sorted := append([]models.Attempt(nil), attempts...)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].Index < sorted[j].Index })
	for i, attempt := range sorted {
		if attempt.Index != i+1 || attempt.TimeMs < 1 || attempt.Scramble == "" {
			return models.Measuring{}, ErrInvalidMeasuring
		}
	}

	average := ao5(sorted)
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return models.Measuring{}, fmt.Errorf("begin measuring: %w", err)
	}
	defer tx.Rollback()

	result, err := tx.ExecContext(ctx, `
		INSERT INTO measurings (user_id, mode, average_ms)
		VALUES (?, ?, ?)
	`, userID, mode, average)
	if err != nil {
		return models.Measuring{}, fmt.Errorf("insert measuring: %w", err)
	}
	id, err := result.LastInsertId()
	if err != nil {
		return models.Measuring{}, fmt.Errorf("measuring id: %w", err)
	}

	for _, attempt := range sorted {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO attempts (measuring_id, attempt_index, time_ms, scramble)
			VALUES (?, ?, ?, ?)
		`, id, attempt.Index, attempt.TimeMs, attempt.Scramble); err != nil {
			return models.Measuring{}, fmt.Errorf("insert attempt: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return models.Measuring{}, fmt.Errorf("commit measuring: %w", err)
	}

	return r.Get(ctx, userID, id)
}

func (r *MeasuringRepository) SaveLobby(ctx context.Context, item models.Lobby) error {
	if item.ID < 1 {
		return nil
	}
	for _, member := range item.Members {
		if member.State == "invited" {
			continue
		}
		if item.Status != "done" && member.State != "left" {
			continue
		}
		if err := r.saveLobbyMember(ctx, item.ID, member); err != nil {
			return err
		}
	}
	return nil
}

func (r *MeasuringRepository) saveLobbyMember(ctx context.Context, lobbyID int64, member models.LobbyMember) error {
	var existing int64
	err := r.db.QueryRowContext(ctx, `
		SELECT measuring_id
		FROM measuring_lobbies
		WHERE lobby_id = ? AND user_id = ?
	`, lobbyID, member.User.ID).Scan(&existing)
	if err == nil {
		return nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return fmt.Errorf("lookup lobby measuring: %w", err)
	}

	attempts := make([]models.Attempt, 0, len(member.Results))
	for _, result := range member.Results {
		if result.TimeMs < 1 || result.Scramble == "" {
			continue
		}
		attempts = append(attempts, models.Attempt{
			Index:    result.Index,
			TimeMs:   result.TimeMs,
			Scramble: result.Scramble,
		})
	}
	if len(attempts) == 0 {
		return nil
	}
	sort.Slice(attempts, func(i, j int) bool { return attempts[i].Index < attempts[j].Index })
	average := int64(0)
	if len(attempts) == 5 {
		average = ao5(attempts)
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin lobby measuring: %w", err)
	}
	defer tx.Rollback()

	result, err := tx.ExecContext(ctx, `
		INSERT INTO measurings (user_id, mode, average_ms)
		VALUES (?, 'multi', ?)
	`, member.User.ID, average)
	if err != nil {
		return fmt.Errorf("insert lobby measuring: %w", err)
	}
	id, err := result.LastInsertId()
	if err != nil {
		return fmt.Errorf("lobby measuring id: %w", err)
	}
	for _, attempt := range attempts {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO attempts (measuring_id, attempt_index, time_ms, scramble)
			VALUES (?, ?, ?, ?)
		`, id, attempt.Index, attempt.TimeMs, attempt.Scramble); err != nil {
			return fmt.Errorf("insert lobby attempt: %w", err)
		}
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO measuring_lobbies (measuring_id, lobby_id, user_id)
		VALUES (?, ?, ?)
	`, id, lobbyID, member.User.ID); err != nil {
		return fmt.Errorf("link lobby measuring: %w", err)
	}
	return tx.Commit()
}

func (r *MeasuringRepository) attachLobby(ctx context.Context, item *models.Measuring) {
	var lobbyID sql.NullInt64
	err := r.db.QueryRowContext(ctx, `
		SELECT lobby_id
		FROM measuring_lobbies
		WHERE measuring_id = ?
	`, item.ID).Scan(&lobbyID)
	if err == nil && lobbyID.Valid {
		item.LobbyID = lobbyID.Int64
	}
	item.AttemptCount = len(item.Attempts)
}

func (r *MeasuringRepository) Get(ctx context.Context, userID, id int64) (models.Measuring, error) {
	var item models.Measuring
	err := r.db.QueryRowContext(ctx, `
		SELECT id, mode, average_ms, created_at
		FROM measurings
		WHERE id = ? AND user_id = ?
	`, id, userID).Scan(&item.ID, &item.Mode, &item.AverageMs, &item.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return models.Measuring{}, ErrInvalidMeasuring
	}
	if err != nil {
		return models.Measuring{}, fmt.Errorf("get measuring: %w", err)
	}

	rows, err := r.db.QueryContext(ctx, `
		SELECT attempt_index, time_ms, scramble
		FROM attempts
		WHERE measuring_id = ?
		ORDER BY attempt_index
	`, id)
	if err != nil {
		return models.Measuring{}, fmt.Errorf("list attempts: %w", err)
	}
	defer rows.Close()

	item.Attempts = make([]models.Attempt, 0, 5)
	for rows.Next() {
		var attempt models.Attempt
		if err := rows.Scan(&attempt.Index, &attempt.TimeMs, &attempt.Scramble); err != nil {
			return models.Measuring{}, fmt.Errorf("scan attempt: %w", err)
		}
		item.Attempts = append(item.Attempts, attempt)
	}
	if err := rows.Err(); err != nil {
		return models.Measuring{}, err
	}
	r.attachLobby(ctx, &item)
	return item, nil
}

func (r *MeasuringRepository) List(ctx context.Context, userID int64, limit int) ([]models.Measuring, error) {
	if limit < 1 {
		limit = 50
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT m.id, m.mode, m.average_ms, m.created_at,
			(SELECT COUNT(*) FROM attempts a WHERE a.measuring_id = m.id),
			ml.lobby_id
		FROM measurings m
		LEFT JOIN measuring_lobbies ml ON ml.measuring_id = m.id
		WHERE m.user_id = ?
			AND (SELECT COUNT(*) FROM attempts a WHERE a.measuring_id = m.id) > 0
		ORDER BY m.created_at DESC, m.id DESC
		LIMIT ?
	`, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("list measurings: %w", err)
	}
	defer rows.Close()

	items := make([]models.Measuring, 0)
	for rows.Next() {
		var item models.Measuring
		var lobbyID sql.NullInt64
		if err := rows.Scan(&item.ID, &item.Mode, &item.AverageMs, &item.CreatedAt, &item.AttemptCount, &lobbyID); err != nil {
			return nil, fmt.Errorf("scan measuring: %w", err)
		}
		if lobbyID.Valid {
			item.LobbyID = lobbyID.Int64
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *MeasuringRepository) BestTimes(ctx context.Context, userID int64, limit int) ([]models.BestTime, error) {
	if limit < 1 {
		limit = 5
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT average_ms, created_at
		FROM measurings
		WHERE user_id = ?
			AND (SELECT COUNT(*) FROM attempts WHERE measuring_id = measurings.id) = 5
		ORDER BY average_ms ASC, created_at ASC
		LIMIT ?
	`, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("list best times: %w", err)
	}
	defer rows.Close()

	items := make([]models.BestTime, 0, limit)
	for rows.Next() {
		var item models.BestTime
		if err := rows.Scan(&item.TimeMs, &item.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan best time: %w", err)
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func ao5(attempts []models.Attempt) int64 {
	times := make([]int64, len(attempts))
	for i, attempt := range attempts {
		times[i] = attempt.TimeMs
	}
	min, max := times[0], times[0]
	minI, maxI := 0, 0
	for i, time := range times {
		if time < min {
			min, minI = time, i
		}
		if time > max {
			max, maxI = time, i
		}
	}
	if minI == maxI {
		maxI = 1
	}
	var sum int64
	var count int64
	for i, time := range times {
		if i == minI || i == maxI {
			continue
		}
		sum += time
		count++
	}
	return sum / count
}
