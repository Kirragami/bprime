package config

import (
	"os"
	"time"
)

type Config struct {
	Port         string
	DatabasePath string
	StaticDir    string
	CORSOrigin   string
	CookieSecure bool
	SessionTTL   time.Duration
}

func Load() Config {
	return Config{
		Port:         env("PORT", "8080"),
		DatabasePath: env("DATABASE_PATH", "./data/bprime.db"),
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
