package auth

import (
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

type window struct {
	count int
	start time.Time
}

type Limiter struct {
	mu       sync.Mutex
	hits     map[string]window
	limit    int
	interval time.Duration
}

func NewLimiter(limit int, interval time.Duration) *Limiter {
	return &Limiter{
		hits:     make(map[string]window),
		limit:    limit,
		interval: interval,
	}
}

func (l *Limiter) Allow(key string) bool {
	now := time.Now()

	l.mu.Lock()
	defer l.mu.Unlock()

	current, ok := l.hits[key]
	if !ok || now.Sub(current.start) >= l.interval {
		l.hits[key] = window{count: 1, start: now}
		return true
	}

	if current.count >= l.limit {
		return false
	}

	current.count++
	l.hits[key] = current
	return true
}

func ClientIP(r *http.Request) string {
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		parts := strings.Split(forwarded, ",")
		return strings.TrimSpace(parts[0])
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
