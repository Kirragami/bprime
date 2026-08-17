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
	return item, rows.Err()
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
