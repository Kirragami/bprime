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
	var user models.User
	err := r.db.QueryRowContext(ctx, `
		SELECT id, username, created_at
		FROM users
		WHERE id = ?
	`, id).Scan(&user.ID, &user.Username, &user.CreatedAt)
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
	err := r.db.QueryRowContext(ctx, `
		SELECT id, username, created_at, password_hash
		FROM users
		WHERE username = ?
	`, username).Scan(&record.ID, &record.Username, &record.CreatedAt, &record.PasswordHash)
	if errors.Is(err, sql.ErrNoRows) {
		return models.UserRecord{}, ErrUserNotFound
	}
	if err != nil {
		return models.UserRecord{}, fmt.Errorf("get user by username: %w", err)
	}
	return record, nil
}
