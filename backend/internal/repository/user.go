package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"bprime/internal/models"
)

var ErrUserNotFound = errors.New("user not found")
var ErrUsernameTaken = errors.New("username taken")

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(ctx context.Context, username, passwordHash string) (models.User, error) {
	result, err := r.db.ExecContext(ctx, `
		INSERT INTO users (username, password_hash)
		VALUES (?, ?)
	`, username, passwordHash)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "unique") {
			return models.User{}, ErrUsernameTaken
		}
		return models.User{}, fmt.Errorf("insert user: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return models.User{}, fmt.Errorf("user id: %w", err)
	}

	return r.GetByID(ctx, id)
}

func (r *UserRepository) GetByID(ctx context.Context, id int64) (models.User, error) {
	user, err := scanUser(r.db.QueryRowContext(ctx, `
		SELECT id, username, created_at, avatar_url
		FROM users
		WHERE id = ?
	`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return models.User{}, ErrUserNotFound
	}
	if err != nil {
		return models.User{}, fmt.Errorf("get user: %w", err)
	}
	return user, nil
}

func (r *UserRepository) GetByUsername(ctx context.Context, username string) (models.UserRecord, error) {
	var record models.UserRecord
	var avatar sql.NullString
	err := r.db.QueryRowContext(ctx, `
		SELECT id, username, created_at, avatar_url, password_hash
		FROM users
		WHERE username = ?
	`, username).Scan(&record.ID, &record.Username, &record.CreatedAt, &avatar, &record.PasswordHash)
	if errors.Is(err, sql.ErrNoRows) {
		return models.UserRecord{}, ErrUserNotFound
	}
	if err != nil {
		return models.UserRecord{}, fmt.Errorf("get user by username: %w", err)
	}
	if avatar.Valid {
		record.AvatarURL = avatar.String
	}
	return record, nil
}

func (r *UserRepository) SetAvatar(ctx context.Context, userID int64, avatarURL string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE users
		SET avatar_url = ?
		WHERE id = ?
	`, avatarURL, userID)
	if err != nil {
		return fmt.Errorf("set avatar: %w", err)
	}
	return nil
}

func scanUser(row interface{ Scan(dest ...any) error }) (models.User, error) {
	var user models.User
	var avatar sql.NullString
	if err := row.Scan(&user.ID, &user.Username, &user.CreatedAt, &avatar); err != nil {
		return models.User{}, err
	}
	if avatar.Valid {
		user.AvatarURL = avatar.String
	}
	return user, nil
}
