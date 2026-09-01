package config

import (
	"os"
	"path/filepath"
	"time"
)

type Config struct {
	Port               string
	DatabasePath       string
	UploadDir          string
	StaticDir          string
	CORSOrigin         string
	AppOrigin          string
	CookieSecure       bool
	SessionTTL         time.Duration
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string
}

func Load() Config {
	databasePath := env("DATABASE_PATH", "./data/bprime.db")
	corsOrigin := env("CORS_ORIGIN", "http://localhost:5173")
	return Config{
		Port:               env("PORT", "8080"),
		DatabasePath:       databasePath,
		UploadDir:          env("UPLOAD_DIR", filepath.Join(filepath.Dir(databasePath), "avatars")),
		StaticDir:          env("STATIC_DIR", ""),
		CORSOrigin:         corsOrigin,
		AppOrigin:          env("APP_ORIGIN", corsOrigin),
		CookieSecure:       env("COOKIE_SECURE", "") == "true",
		SessionTTL:         7 * 24 * time.Hour,
		GoogleClientID:     env("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: env("GOOGLE_CLIENT_SECRET", ""),
		GoogleRedirectURL:  env("GOOGLE_REDIRECT_URL", ""),
	}
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
