package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"bprime/internal/models"
)

var (
	ErrLobbyNotFound   = errors.New("lobby not found")
	ErrLobbyForbidden  = errors.New("lobby forbidden")
	ErrLobbyConflict   = errors.New("lobby conflict")
	ErrLobbyBusy       = errors.New("already in a lobby")
	ErrLobbyClosed     = errors.New("lobby closed")
	ErrLobbyNotReady   = errors.New("lobby not ready")
	ErrLobbyAlone      = errors.New("need another player")
	ErrLobbyDuplicate  = errors.New("already submitted")
	ErrNotFriends      = errors.New("not friends")
	ErrInvalidScramble = errors.New("invalid scramble")
	ErrInvalidTime     = errors.New("invalid time")
)

type LobbyRepository struct {
	db      *sql.DB
	friends *FriendRepository
}

func NewLobbyRepository(db *sql.DB, friends *FriendRepository) *LobbyRepository {
	return &LobbyRepository{db: db, friends: friends}
}

func (r *LobbyRepository) Create(ctx context.Context, hostID int64) (models.Lobby, error) {
	if id, err := r.activeID(ctx, hostID, true); err != nil {
		return models.Lobby{}, err
	} else if id > 0 {
		return r.Get(ctx, id)
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return models.Lobby{}, fmt.Errorf("begin lobby: %w", err)
	}
	defer tx.Rollback()

	result, err := tx.ExecContext(ctx, `
		INSERT INTO lobbies (host_id, status, attempt_index, scramble)
		VALUES (?, 'open', 1, '')
	`, hostID)
	if err != nil {
		return models.Lobby{}, fmt.Errorf("insert lobby: %w", err)
	}
	id, err := result.LastInsertId()
	if err != nil {
		return models.Lobby{}, fmt.Errorf("lobby id: %w", err)
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO lobby_members (lobby_id, user_id, state)
		VALUES (?, ?, 'joined')
	`, id, hostID); err != nil {
		return models.Lobby{}, fmt.Errorf("insert host: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return models.Lobby{}, fmt.Errorf("commit lobby: %w", err)
	}
	return r.Get(ctx, id)
}

func (r *LobbyRepository) Get(ctx context.Context, id int64) (models.Lobby, error) {
	var item models.Lobby
	err := r.db.QueryRowContext(ctx, `
		SELECT id, host_id, status, attempt_index, scramble, created_at
		FROM lobbies
		WHERE id = ?
	`, id).Scan(&item.ID, &item.HostID, &item.Status, &item.AttemptIndex, &item.Scramble, &item.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return models.Lobby{}, ErrLobbyNotFound
	}
	if err != nil {
		return models.Lobby{}, fmt.Errorf("get lobby: %w", err)
	}

	members, err := r.listMembers(ctx, id)
	if err != nil {
		return models.Lobby{}, err
	}
	item.Members = members
	return item, nil
}

func (r *LobbyRepository) Current(ctx context.Context, userID int64) (models.Lobby, error) {
	id, err := r.activeID(ctx, userID, false)
	if err != nil {
		return models.Lobby{}, err
	}
	if id < 1 {
		return models.Lobby{}, ErrLobbyNotFound
	}
	return r.Get(ctx, id)
}

func (r *LobbyRepository) Invite(ctx context.Context, lobbyID, hostID, targetID int64) (models.Lobby, error) {
	item, err := r.Get(ctx, lobbyID)
	if err != nil {
		return models.Lobby{}, err
	}
	if item.HostID != hostID {
		return models.Lobby{}, ErrLobbyForbidden
	}
	if item.Status != "open" {
		return models.Lobby{}, ErrLobbyClosed
	}
	if targetID == hostID {
		return models.Lobby{}, ErrLobbyConflict
	}
	ok, err := r.friends.AreFriends(ctx, hostID, targetID)
	if err != nil {
		return models.Lobby{}, err
	}
	if !ok {
		return models.Lobby{}, ErrNotFriends
	}
	if other, err := r.activeID(ctx, targetID, true); err != nil {
		return models.Lobby{}, err
	} else if other > 0 && other != lobbyID {
		return models.Lobby{}, ErrLobbyBusy
	}

	if _, err := r.db.ExecContext(ctx, `
		INSERT INTO lobby_members (lobby_id, user_id, state)
		VALUES (?, ?, 'invited')
		ON CONFLICT(lobby_id, user_id) DO UPDATE SET state = 'invited'
		WHERE lobby_members.state = 'left'
	`, lobbyID, targetID); err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "unique") {
			return models.Lobby{}, ErrLobbyConflict
		}
		return models.Lobby{}, fmt.Errorf("invite member: %w", err)
	}
	return r.Get(ctx, lobbyID)
}

func (r *LobbyRepository) Join(ctx context.Context, lobbyID, userID int64) (models.Lobby, error) {
	item, err := r.Get(ctx, lobbyID)
	if err != nil {
		return models.Lobby{}, err
	}
	if item.Status != "open" {
		return models.Lobby{}, ErrLobbyClosed
	}
	member, ok := memberOf(item, userID)
	if !ok || member.State != "invited" {
		return models.Lobby{}, ErrLobbyForbidden
	}
	if other, err := r.activeJoinedID(ctx, userID); err != nil {
		return models.Lobby{}, err
	} else if other > 0 && other != lobbyID {
		return models.Lobby{}, ErrLobbyBusy
	}
	if _, err := r.db.ExecContext(ctx, `
		UPDATE lobby_members
		SET state = 'joined'
		WHERE lobby_id = ? AND user_id = ? AND state = 'invited'
	`, lobbyID, userID); err != nil {
		return models.Lobby{}, fmt.Errorf("join lobby: %w", err)
	}
	return r.Get(ctx, lobbyID)
}

func (r *LobbyRepository) Leave(ctx context.Context, lobbyID, userID int64) (models.Lobby, error) {
	item, err := r.Get(ctx, lobbyID)
	if err != nil {
		return models.Lobby{}, err
	}
	if item.HostID == userID && item.Status != "done" {
		if _, err := r.db.ExecContext(ctx, `UPDATE lobbies SET status = 'done' WHERE id = ?`, lobbyID); err != nil {
			return models.Lobby{}, fmt.Errorf("end lobby: %w", err)
		}
	}
	if item.Status == "done" || item.HostID == userID {
		if _, err := r.db.ExecContext(ctx, `
			UPDATE lobby_members
			SET state = 'left'
			WHERE lobby_id = ? AND user_id = ?
		`, lobbyID, userID); err != nil {
			return models.Lobby{}, fmt.Errorf("leave done lobby: %w", err)
		}
		return r.Get(ctx, lobbyID)
	}
	if _, ok := memberOf(item, userID); !ok {
		return models.Lobby{}, ErrLobbyForbidden
	}
	if _, err := r.db.ExecContext(ctx, `
		UPDATE lobby_members
		SET state = 'left'
		WHERE lobby_id = ? AND user_id = ?
	`, lobbyID, userID); err != nil {
		return models.Lobby{}, fmt.Errorf("leave lobby: %w", err)
	}
	if err := r.advanceIfReady(ctx, lobbyID); err != nil {
		return models.Lobby{}, err
	}
	return r.Get(ctx, lobbyID)
}

func (r *LobbyRepository) SetScramble(ctx context.Context, lobbyID, hostID int64, scramble string) (models.Lobby, error) {
	scramble = strings.TrimSpace(scramble)
	if scramble == "" {
		return models.Lobby{}, ErrInvalidScramble
	}
	item, err := r.Get(ctx, lobbyID)
	if err != nil {
		return models.Lobby{}, err
	}
	if item.HostID != hostID {
		return models.Lobby{}, ErrLobbyForbidden
	}

	switch item.Status {
	case "open":
		if joinedCount(item) < 2 {
			return models.Lobby{}, ErrLobbyAlone
		}
		if _, err := r.db.ExecContext(ctx, `
			UPDATE lobbies
			SET scramble = ?, status = 'attempt', attempt_index = 1
			WHERE id = ?
		`, scramble, lobbyID); err != nil {
			return models.Lobby{}, fmt.Errorf("start scramble: %w", err)
		}
	case "hold":
		if item.AttemptIndex >= 5 {
			return models.Lobby{}, ErrLobbyClosed
		}
		if _, err := r.db.ExecContext(ctx, `
			UPDATE lobbies
			SET scramble = ?, status = 'attempt', attempt_index = attempt_index + 1
			WHERE id = ?
		`, scramble, lobbyID); err != nil {
			return models.Lobby{}, fmt.Errorf("next scramble: %w", err)
		}
	default:
		return models.Lobby{}, ErrLobbyNotReady
	}
	return r.Get(ctx, lobbyID)
}

func (r *LobbyRepository) SubmitTime(ctx context.Context, lobbyID, userID, timeMs int64) (models.Lobby, error) {
	if timeMs < 1 {
		return models.Lobby{}, ErrInvalidTime
	}
	item, err := r.Get(ctx, lobbyID)
	if err != nil {
		return models.Lobby{}, err
	}
	if item.Status != "attempt" || item.Scramble == "" {
		return models.Lobby{}, ErrLobbyNotReady
	}
	member, ok := memberOf(item, userID)
	if !ok || member.State != "joined" {
		return models.Lobby{}, ErrLobbyForbidden
	}
	for _, result := range member.Results {
		if result.Index == item.AttemptIndex {
			return models.Lobby{}, ErrLobbyDuplicate
		}
	}

	if _, err := r.db.ExecContext(ctx, `
		INSERT INTO lobby_results (lobby_id, user_id, attempt_index, time_ms, scramble)
		VALUES (?, ?, ?, ?, ?)
	`, lobbyID, userID, item.AttemptIndex, timeMs, item.Scramble); err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "unique") {
			return models.Lobby{}, ErrLobbyDuplicate
		}
		return models.Lobby{}, fmt.Errorf("insert result: %w", err)
	}
	if err := r.advanceIfReady(ctx, lobbyID); err != nil {
		return models.Lobby{}, err
	}
	return r.Get(ctx, lobbyID)
}

func (r *LobbyRepository) MemberIDs(item models.Lobby) []int64 {
	ids := make([]int64, 0, len(item.Members)+1)
	ids = append(ids, item.HostID)
	seen := map[int64]struct{}{item.HostID: {}}
	for _, member := range item.Members {
		if _, ok := seen[member.User.ID]; ok {
			continue
		}
		seen[member.User.ID] = struct{}{}
		ids = append(ids, member.User.ID)
	}
	return ids
}

func (r *LobbyRepository) advanceIfReady(ctx context.Context, lobbyID int64) error {
	item, err := r.Get(ctx, lobbyID)
	if err != nil {
		return err
	}
	if item.Status != "attempt" {
		return nil
	}
	for _, member := range item.Members {
		if member.State != "joined" {
			continue
		}
		has := false
		for _, result := range member.Results {
			if result.Index == item.AttemptIndex {
				has = true
				break
			}
		}
		if !has {
			return nil
		}
	}
	next := "hold"
	if item.AttemptIndex >= 5 {
		next = "done"
	}
	_, err = r.db.ExecContext(ctx, `UPDATE lobbies SET status = ? WHERE id = ?`, next, lobbyID)
	return err
}

func (r *LobbyRepository) activeID(ctx context.Context, userID int64, joinedOnly bool) (int64, error) {
	query := `
		SELECT l.id
		FROM lobbies l
		JOIN lobby_members m ON m.lobby_id = l.id
		WHERE m.user_id = ?
			AND l.status != 'done'
			AND (
				m.state = 'joined'
				OR (m.state = 'invited' AND l.status = 'open')
			)
		ORDER BY l.id DESC
		LIMIT 1
	`
	if joinedOnly {
		query = `
			SELECT l.id
			FROM lobbies l
			JOIN lobby_members m ON m.lobby_id = l.id
			WHERE m.user_id = ?
				AND l.status != 'done'
				AND m.state = 'joined'
			ORDER BY l.id DESC
			LIMIT 1
		`
	}
	var id int64
	err := r.db.QueryRowContext(ctx, query, userID).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, nil
	}
	if err != nil {
		return 0, fmt.Errorf("active lobby: %w", err)
	}
	return id, nil
}

func (r *LobbyRepository) activeJoinedID(ctx context.Context, userID int64) (int64, error) {
	return r.activeID(ctx, userID, true)
}

func (r *LobbyRepository) latestDoneID(ctx context.Context, userID int64) (int64, error) {
	var id int64
	err := r.db.QueryRowContext(ctx, `
		SELECT l.id
		FROM lobbies l
		JOIN lobby_members m ON m.lobby_id = l.id
		WHERE m.user_id = ? AND m.state = 'joined' AND l.status = 'done'
		ORDER BY l.id DESC
		LIMIT 1
	`, userID).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, nil
	}
	if err != nil {
		return 0, fmt.Errorf("done lobby: %w", err)
	}
	return id, nil
}

func (r *LobbyRepository) listMembers(ctx context.Context, lobbyID int64) ([]models.LobbyMember, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT u.id, u.username, u.created_at, u.avatar_url, m.state, (
			SELECT MIN(average_ms)
			FROM measurings
			WHERE user_id = u.id
		)
		FROM lobby_members m
		JOIN users u ON u.id = m.user_id
		WHERE m.lobby_id = ?
		ORDER BY m.state = 'joined' DESC, u.username COLLATE NOCASE
	`, lobbyID)
	if err != nil {
		return nil, fmt.Errorf("list members: %w", err)
	}
	defer rows.Close()

	members := make([]models.LobbyMember, 0)
	index := map[int64]int{}
	for rows.Next() {
		var member models.LobbyMember
		var avatar sql.NullString
		var best sql.NullInt64
		if err := rows.Scan(
			&member.User.ID,
			&member.User.Username,
			&member.User.CreatedAt,
			&avatar,
			&member.State,
			&best,
		); err != nil {
			return nil, fmt.Errorf("scan member: %w", err)
		}
		if avatar.Valid {
			member.User.AvatarURL = avatar.String
		}
		if best.Valid {
			member.User.BestMs = best.Int64
		}
		member.Results = make([]models.LobbyResult, 0)
		index[member.User.ID] = len(members)
		members = append(members, member)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	resultRows, err := r.db.QueryContext(ctx, `
		SELECT user_id, attempt_index, time_ms, scramble
		FROM lobby_results
		WHERE lobby_id = ?
		ORDER BY attempt_index
	`, lobbyID)
	if err != nil {
		return nil, fmt.Errorf("list results: %w", err)
	}
	defer resultRows.Close()

	for resultRows.Next() {
		var userID int64
		var result models.LobbyResult
		if err := resultRows.Scan(&userID, &result.Index, &result.TimeMs, &result.Scramble); err != nil {
			return nil, fmt.Errorf("scan result: %w", err)
		}
		if i, ok := index[userID]; ok {
			members[i].Results = append(members[i].Results, result)
		}
	}
	return members, resultRows.Err()
}

func joinedCount(item models.Lobby) int {
	count := 0
	for _, member := range item.Members {
		if member.State == "joined" {
			count++
		}
	}
	return count
}

func memberOf(item models.Lobby, userID int64) (models.LobbyMember, bool) {
	for _, member := range item.Members {
		if member.User.ID == userID {
			return member, true
		}
	}
	return models.LobbyMember{}, false
}
