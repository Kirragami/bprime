package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"bprime/internal/repository"
)

type addFriendRequest struct {
	Username string `json:"username"`
}

func (h *Handler) ListFriends(w http.ResponseWriter, r *http.Request) {
	user, ok := h.userFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "not signed in")
		return
	}

	friends, err := h.friends.List(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list friends")
		return
	}

	writeJSON(w, http.StatusOK, friends)
}

func (h *Handler) AddFriend(w http.ResponseWriter, r *http.Request) {
	user, ok := h.userFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "not signed in")
		return
	}

	var req addFriendRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	username := strings.TrimSpace(req.Username)
	if username == "" {
		writeError(w, http.StatusBadRequest, "username is required")
		return
	}

	record, err := h.users.GetByUsername(r.Context(), username)
	if errors.Is(err, repository.ErrUserNotFound) {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to add friend")
		return
	}

	if err := h.friends.Add(r.Context(), user.ID, record.ID); err != nil {
		if errors.Is(err, repository.ErrSelfFriend) {
			writeError(w, http.StatusBadRequest, "you cannot add yourself")
			return
		}
		if errors.Is(err, repository.ErrAlreadyFriends) {
			writeError(w, http.StatusConflict, "already friends")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to add friend")
		return
	}

	writeJSON(w, http.StatusCreated, record.User)
}
