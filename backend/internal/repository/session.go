package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"bprime/internal/models"
)

var ErrSessionNotFound = errors.New("session not found")

type SessionRepository struct {
	db *sql.DB
}

func NewSessionRepository(db *sql.DB) *SessionRepository {
	return &SessionRepository{db: db}
}

func (r *SessionRepository) Create(ctx context.Context, tokenHash string, userID int64, expiresAt time.Time) error {
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO sessions (token_hash, user_id, expires_at)
		VALUES (?, ?, ?)
	`, tokenHash, userID, expiresAt.UTC().Format(time.RFC3339Nano))
	if err != nil {
		return fmt.Errorf("insert session: %w", err)
	}
	return nil
}

func (r *SessionRepository) UserForToken(ctx context.Context, tokenHash string, now time.Time) (models.User, error) {
	user, err := scanUser(r.db.QueryRowContext(ctx, `
		SELECT users.id, users.username, users.created_at, users.avatar_url
		FROM sessions
		JOIN users ON users.id = sessions.user_id
		WHERE sessions.token_hash = ?
		  AND sessions.expires_at > ?
	`, tokenHash, now.UTC().Format(time.RFC3339Nano)))
	if errors.Is(err, sql.ErrNoRows) {
		return models.User{}, ErrSessionNotFound
	}
	if err != nil {
		return models.User{}, fmt.Errorf("session user: %w", err)
	}
	return user, nil
}

func (r *SessionRepository) Delete(ctx context.Context, tokenHash string) error {
	_, err := r.db.ExecContext(ctx, `DELETE FROM sessions WHERE token_hash = ?`, tokenHash)
	if err != nil {
		return fmt.Errorf("delete session: %w", err)
	}
	return nil
}

func (r *SessionRepository) DeleteExpired(ctx context.Context, now time.Time) error {
	_, err := r.db.ExecContext(ctx, `
		DELETE FROM sessions
		WHERE expires_at <= ?
	`, now.UTC().Format(time.RFC3339Nano))
	if err != nil {
		return fmt.Errorf("delete expired sessions: %w", err)
	}
	return nil
}
