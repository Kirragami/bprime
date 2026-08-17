package config

import (
	"os"
)

type Config struct {
	Port         string
	DatabasePath string
	CORSOrigin   string
}

func Load() Config {
	return Config{
		Port:         env("PORT", "8080"),
		DatabasePath: env("DATABASE_PATH", "./data/bprime.db"),
		CORSOrigin:   env("CORS_ORIGIN", "http://localhost:5173"),
	}
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
