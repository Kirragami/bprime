package handler

import (
	"database/sql"
	"time"

	"bprime/internal/auth"
	"bprime/internal/config"
	"bprime/internal/repository"
)

type Handler struct {
	db           *sql.DB
	items        *repository.ItemRepository
	users        *repository.UserRepository
	sessions     *repository.SessionRepository
	friends      *repository.FriendRepository
	limiter      *auth.Limiter
	dummyHash    string
	sessionTTL   time.Duration
	cookieSecure bool
}

func New(
	db *sql.DB,
	items *repository.ItemRepository,
	users *repository.UserRepository,
	sessions *repository.SessionRepository,
	friends *repository.FriendRepository,
	cfg config.Config,
) *Handler {
	dummyHash, err := auth.HashPassword("dummy-password-for-timing")
	if err != nil {
		dummyHash = "$2a$12$C6UzMDM.H6DfHr/e5KAh.OFr5ynQpzwkC.S0lUqQ0q0q0q0q0q0q."
	}

	return &Handler{
		db:           db,
		items:        items,
		users:        users,
		sessions:     sessions,
		friends:      friends,
		limiter:      auth.NewLimiter(authRateLimit, authRateWindow),
		dummyHash:    dummyHash,
		sessionTTL:   cfg.SessionTTL,
		cookieSecure: cfg.CookieSecure,
	}
}
