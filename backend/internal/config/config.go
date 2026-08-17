package config

import (
	"os"
	"path/filepath"
	"time"
)

type Config struct {
	Port         string
	DatabasePath string
	UploadDir    string
	StaticDir    string
	CORSOrigin   string
	CookieSecure bool
	SessionTTL   time.Duration
}

func Load() Config {
	databasePath := env("DATABASE_PATH", "./data/bprime.db")
	return Config{
		Port:         env("PORT", "8080"),
		DatabasePath: databasePath,
		UploadDir:    env("UPLOAD_DIR", filepath.Join(filepath.Dir(databasePath), "avatars")),
		StaticDir:    env("STATIC_DIR", ""),
		CORSOrigin:   env("CORS_ORIGIN", "http://localhost:5173"),
		CookieSecure: env("COOKIE_SECURE", "") == "true",
		SessionTTL:   7 * 24 * time.Hour,
	}
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
