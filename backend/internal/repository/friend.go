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
	ErrAlreadyFriends = errors.New("already friends")
	ErrSelfFriend     = errors.New("cannot add yourself")
)

type FriendRepository struct {
	db *sql.DB
}

func NewFriendRepository(db *sql.DB) *FriendRepository {
	return &FriendRepository{db: db}
}

func (r *FriendRepository) Add(ctx context.Context, userID, friendID int64) error {
	if userID == friendID {
		return ErrSelfFriend
	}

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO friendships (user_id, friend_id)
		VALUES (?, ?)
	`, userID, friendID)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "unique") {
			return ErrAlreadyFriends
		}
		return fmt.Errorf("add friend: %w", err)
	}
	return nil
}

func (r *FriendRepository) List(ctx context.Context, userID int64) ([]models.User, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT u.id, u.username, u.created_at
		FROM friendships f
		JOIN users u ON u.id = f.friend_id
		WHERE f.user_id = ?
		ORDER BY u.username COLLATE NOCASE
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("list friends: %w", err)
	}
	defer rows.Close()

	friends := make([]models.User, 0)
	for rows.Next() {
		var user models.User
		if err := rows.Scan(&user.ID, &user.Username, &user.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan friend: %w", err)
		}
		friends = append(friends, user)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate friends: %w", err)
	}

	return friends, nil
}
