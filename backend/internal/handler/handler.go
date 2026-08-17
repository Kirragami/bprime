package handler

import (
	"database/sql"
	"os"
	"time"

	"bprime/internal/auth"
	"bprime/internal/config"
	"bprime/internal/realtime"
	"bprime/internal/repository"
)

type Handler struct {
	db           *sql.DB
	items        *repository.ItemRepository
	users        *repository.UserRepository
	sessions     *repository.SessionRepository
	friends      *repository.FriendRepository
	events       *realtime.Hub
	limiter      *auth.Limiter
	dummyHash    string
	sessionTTL   time.Duration
	cookieSecure bool
	uploadDir    string
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

	_ = os.MkdirAll(cfg.UploadDir, 0o755)

	return &Handler{
		db:           db,
		items:        items,
		users:        users,
		sessions:     sessions,
		friends:      friends,
		events:       realtime.NewHub(),
		limiter:      auth.NewLimiter(authRateLimit, authRateWindow),
		dummyHash:    dummyHash,
		sessionTTL:   cfg.SessionTTL,
		cookieSecure: cfg.CookieSecure,
		uploadDir:    cfg.UploadDir,
	}
}
