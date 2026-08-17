package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
)

func NewSessionToken() (raw string, hash string, err error) {
	var bytes [32]byte
	if _, err = rand.Read(bytes[:]); err != nil {
		return "", "", fmt.Errorf("session token: %w", err)
	}
	raw = hex.EncodeToString(bytes[:])
	return raw, HashToken(raw), nil
}

func HashToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}
