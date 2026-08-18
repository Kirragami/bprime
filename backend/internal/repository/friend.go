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
	ErrAlreadyFriends  = errors.New("already friends")
	ErrAlreadyPending  = errors.New("request already sent")
	ErrSelfFriend      = errors.New("cannot add yourself")
	ErrRequestNotFound = errors.New("request not found")
)

type Friendship struct {
	ID          int64
	RequesterID int64
	AddresseeID int64
	Status      string
}

type FriendRepository struct {
	db *sql.DB
}

func NewFriendRepository(db *sql.DB) *FriendRepository {
	return &FriendRepository{db: db}
}

func (r *FriendRepository) Request(ctx context.Context, requesterID, addresseeID int64) (string, error) {
	if requesterID == addresseeID {
		return "", ErrSelfFriend
	}

	existing, err := r.FindPair(ctx, requesterID, addresseeID)
	if err == nil {
		if existing.Status == "accepted" {
			return "", ErrAlreadyFriends
		}
		if existing.RequesterID == requesterID {
			return "", ErrAlreadyPending
		}
		if err := r.Accept(ctx, existing.ID, requesterID); err != nil {
			return "", err
		}
		return "accepted", nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return "", err
	}

	_, err = r.db.ExecContext(ctx, `
		INSERT INTO friendships (requester_id, addressee_id, status)
		VALUES (?, ?, 'pending')
	`, requesterID, addresseeID)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "unique") {
			return "", ErrAlreadyPending
		}
		return "", fmt.Errorf("create friend request: %w", err)
	}
	return "pending", nil
}

func (r *FriendRepository) Accept(ctx context.Context, requestID, userID int64) error {
	result, err := r.db.ExecContext(ctx, `
		UPDATE friendships
		SET status = 'accepted'
		WHERE id = ? AND addressee_id = ? AND status = 'pending'
	`, requestID, userID)
	if err != nil {
		return fmt.Errorf("accept friend request: %w", err)
	}
	n, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("accept friend request: %w", err)
	}
	if n == 0 {
		return ErrRequestNotFound
	}
	return nil
}

func (r *FriendRepository) Reject(ctx context.Context, requestID, userID int64) error {
	result, err := r.db.ExecContext(ctx, `
		DELETE FROM friendships
		WHERE id = ? AND addressee_id = ? AND status = 'pending'
	`, requestID, userID)
	if err != nil {
		return fmt.Errorf("reject friend request: %w", err)
	}
	n, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("reject friend request: %w", err)
	}
	if n == 0 {
		return ErrRequestNotFound
	}
	return nil
}

func (r *FriendRepository) Get(ctx context.Context, requestID int64) (Friendship, error) {
	var row Friendship
	err := r.db.QueryRowContext(ctx, `
		SELECT id, requester_id, addressee_id, status
		FROM friendships
		WHERE id = ?
	`, requestID).Scan(&row.ID, &row.RequesterID, &row.AddresseeID, &row.Status)
	if errors.Is(err, sql.ErrNoRows) {
		return Friendship{}, ErrRequestNotFound
	}
	if err != nil {
		return Friendship{}, fmt.Errorf("get friendship: %w", err)
	}
	return row, nil
}

func (r *FriendRepository) List(ctx context.Context, userID int64) (models.FriendGraph, error) {
	graph := models.FriendGraph{
		Friends:  make([]models.User, 0),
		Incoming: make([]models.FriendRequest, 0),
		Outgoing: make([]models.FriendRequest, 0),
	}

	friends, err := r.queryUsers(ctx, `
		SELECT u.id, u.username, u.created_at, u.avatar_url, (
			SELECT MIN(m.average_ms)
			FROM measurings m
			WHERE m.user_id = u.id
		)
		FROM friendships f
		JOIN users u ON u.id = CASE
			WHEN f.requester_id = ? THEN f.addressee_id
			ELSE f.requester_id
		END
		WHERE f.status = 'accepted'
			AND (f.requester_id = ? OR f.addressee_id = ?)
		ORDER BY u.username COLLATE NOCASE
	`, userID, userID, userID)
	if err != nil {
		return graph, fmt.Errorf("list friends: %w", err)
	}
	graph.Friends = friends

	incoming, err := r.queryRequests(ctx, `
		SELECT f.id, u.id, u.username, u.created_at, u.avatar_url, f.created_at
		FROM friendships f
		JOIN users u ON u.id = f.requester_id
		WHERE f.addressee_id = ? AND f.status = 'pending'
		ORDER BY f.created_at DESC
	`, userID)
	if err != nil {
		return graph, fmt.Errorf("list incoming requests: %w", err)
	}
	graph.Incoming = incoming

	outgoing, err := r.queryRequests(ctx, `
		SELECT f.id, u.id, u.username, u.created_at, u.avatar_url, f.created_at
		FROM friendships f
		JOIN users u ON u.id = f.addressee_id
		WHERE f.requester_id = ? AND f.status = 'pending'
		ORDER BY f.created_at DESC
	`, userID)
	if err != nil {
		return graph, fmt.Errorf("list outgoing requests: %w", err)
	}
	graph.Outgoing = outgoing

	return graph, nil
}

func (r *FriendRepository) AreFriends(ctx context.Context, a, b int64) (bool, error) {
	row, err := r.FindPair(ctx, a, b)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return row.Status == "accepted", nil
}

func (r *FriendRepository) FindPair(ctx context.Context, a, b int64) (Friendship, error) {
	var row Friendship
	err := r.db.QueryRowContext(ctx, `
		SELECT id, requester_id, addressee_id, status
		FROM friendships
		WHERE (requester_id = ? AND addressee_id = ?)
			OR (requester_id = ? AND addressee_id = ?)
	`, a, b, b, a).Scan(&row.ID, &row.RequesterID, &row.AddresseeID, &row.Status)
	if err != nil {
		return Friendship{}, err
	}
	return row, nil
}

func (r *FriendRepository) queryUsers(ctx context.Context, query string, args ...any) ([]models.User, error) {
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]models.User, 0)
	for rows.Next() {
		user, err := scanFriend(rows)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	return users, rows.Err()
}

func scanFriend(row interface{ Scan(dest ...any) error }) (models.User, error) {
	var user models.User
	var avatar sql.NullString
	var best sql.NullInt64
	if err := row.Scan(&user.ID, &user.Username, &user.CreatedAt, &avatar, &best); err != nil {
		return models.User{}, err
	}
	if avatar.Valid {
		user.AvatarURL = avatar.String
	}
	if best.Valid {
		user.BestMs = best.Int64
	}
	return user, nil
}

func (r *FriendRepository) queryRequests(ctx context.Context, query string, args ...any) ([]models.FriendRequest, error) {
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	requests := make([]models.FriendRequest, 0)
	for rows.Next() {
		var item models.FriendRequest
		var avatar sql.NullString
		if err := rows.Scan(
			&item.ID,
			&item.User.ID,
			&item.User.Username,
			&item.User.CreatedAt,
			&avatar,
			&item.CreatedAt,
		); err != nil {
			return nil, err
		}
		if avatar.Valid {
			item.User.AvatarURL = avatar.String
		}
		requests = append(requests, item)
	}
	return requests, rows.Err()
}
