package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"bprime/internal/auth"
	"bprime/internal/models"
	"bprime/internal/repository"
)

const (
	sessionCookie   = "bprime_session"
	minUsernameLen  = 3
	maxUsernameLen  = 20
	minPasswordLen  = 8
	maxPasswordLen  = 72
	authRateLimit   = 10
	authRateWindow  = 10 * time.Minute
)

var usernamePattern = regexp.MustCompile(`^[a-zA-Z0-9_]+$`)

type authRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	if !h.allowAuth(r) {
		writeError(w, http.StatusTooManyRequests, "too many attempts, try later")
		return
	}

	req, ok := decodeAuth(w, r)
	if !ok {
		return
	}

	if err := validateUsername(req.Username); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := validatePassword(req.Password); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create account")
		return
	}

	user, err := h.users.Create(r.Context(), req.Username, hash)
	if errors.Is(err, repository.ErrUsernameTaken) {
		writeError(w, http.StatusConflict, "username taken")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not create account")
		return
	}

	if err := h.startSession(w, r, user.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "could not start session")
		return
	}

	writeJSON(w, http.StatusCreated, userResponse(user))
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	if !h.allowAuth(r) {
		writeError(w, http.StatusTooManyRequests, "too many attempts, try later")
		return
	}

	req, ok := decodeAuth(w, r)
	if !ok {
		return
	}

	record, err := h.users.GetByUsername(r.Context(), req.Username)
	hash := h.dummyHash
	if err == nil {
		hash = record.PasswordHash
	}

	if !auth.CheckPassword(hash, req.Password) || err != nil || record.NeedsUsername || record.PasswordHash == "" {
		writeError(w, http.StatusUnauthorized, "invalid username or password")
		return
	}

	if err := h.startSession(w, r, record.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "could not start session")
		return
	}

	writeJSON(w, http.StatusOK, userResponse(record.User))
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	if cookie, err := r.Cookie(sessionCookie); err == nil && cookie.Value != "" {
		_ = h.sessions.Delete(r.Context(), auth.HashToken(cookie.Value))
	}
	h.clearSessionCookie(w)
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	user, ok := h.userFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "not signed in")
		return
	}
	writeJSON(w, http.StatusOK, userResponse(user))
}

func (h *Handler) CompleteUsername(w http.ResponseWriter, r *http.Request) {
	user, ok := h.userFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "not signed in")
		return
	}
	if !user.NeedsUsername {
		writeError(w, http.StatusBadRequest, "username already set")
		return
	}

	var req struct {
		Username string `json:"username"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	req.Username = strings.TrimSpace(req.Username)

	if err := validateUsername(req.Username); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if strings.HasPrefix(strings.ToLower(req.Username), "pending_") {
		writeError(w, http.StatusBadRequest, "username can only use letters, numbers, and _")
		return
	}

	updated, err := h.users.CompleteUsername(r.Context(), user.ID, req.Username)
	if errors.Is(err, repository.ErrUsernameTaken) {
		writeError(w, http.StatusConflict, "username taken")
		return
	}
	if errors.Is(err, repository.ErrUsernameNotPending) {
		writeError(w, http.StatusBadRequest, "username already set")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not set username")
		return
	}

	writeJSON(w, http.StatusOK, userResponse(updated))
}

func (h *Handler) allowAuth(r *http.Request) bool {
	return h.limiter.Allow(auth.ClientIP(r))
}

func (h *Handler) startSession(w http.ResponseWriter, r *http.Request, userID int64) error {
	raw, hash, err := auth.NewSessionToken()
	if err != nil {
		return err
	}

	expires := time.Now().Add(h.sessionTTL)
	if err := h.sessions.Create(r.Context(), hash, userID, expires); err != nil {
		return err
	}

	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookie,
		Value:    raw,
		Path:     "/",
		Expires:  expires,
		MaxAge:   int(h.sessionTTL.Seconds()),
		HttpOnly: true,
		Secure:   h.cookieSecure,
		SameSite: http.SameSiteLaxMode,
	})
	return nil
}

func (h *Handler) clearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookie,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   h.cookieSecure,
		SameSite: http.SameSiteLaxMode,
	})
}

func (h *Handler) userFromRequest(r *http.Request) (models.User, bool) {
	cookie, err := r.Cookie(sessionCookie)
	if err != nil || cookie.Value == "" {
		return models.User{}, false
	}

	user, err := h.sessions.UserForToken(r.Context(), auth.HashToken(cookie.Value), time.Now())
	if err != nil {
		return models.User{}, false
	}
	return user, true
}

func decodeAuth(w http.ResponseWriter, r *http.Request) (authRequest, bool) {
	var req authRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return authRequest{}, false
	}
	req.Username = strings.TrimSpace(req.Username)
	return req, true
}

func validateUsername(username string) error {
	length := utf8.RuneCountInString(username)
	if length < minUsernameLen || length > maxUsernameLen {
		return errors.New("username must be 3-20 characters")
	}
	if !usernamePattern.MatchString(username) {
		return errors.New("username can only use letters, numbers, and _")
	}
	return nil
}

func validatePassword(password string) error {
	length := utf8.RuneCountInString(password)
	if length < minPasswordLen {
		return errors.New("password must be at least 8 characters")
	}
	if length > maxPasswordLen {
		return errors.New("password is too long")
	}
	return nil
}
