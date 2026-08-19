package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
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

	graph, err := h.friends.List(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list friends")
		return
	}

	writeJSON(w, http.StatusOK, graph)
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

	status, err := h.friends.Request(r.Context(), user.ID, record.ID)
	if err != nil {
		if errors.Is(err, repository.ErrSelfFriend) {
			writeError(w, http.StatusBadRequest, "you cannot add yourself")
			return
		}
		if errors.Is(err, repository.ErrAlreadyFriends) {
			writeError(w, http.StatusConflict, "already friends")
			return
		}
		if errors.Is(err, repository.ErrAlreadyPending) {
			writeError(w, http.StatusConflict, "request already sent")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to add friend")
		return
	}

	h.events.Notify(user.ID, record.ID)
	writeJSON(w, http.StatusCreated, map[string]any{
		"status": status,
		"user":   record.User,
	})
}

func (h *Handler) AcceptFriend(w http.ResponseWriter, r *http.Request) {
	h.respondToFriend(w, r, true)
}

func (h *Handler) RejectFriend(w http.ResponseWriter, r *http.Request) {
	h.respondToFriend(w, r, false)
}

func (h *Handler) respondToFriend(w http.ResponseWriter, r *http.Request, accept bool) {
	user, ok := h.userFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "not signed in")
		return
	}

	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id < 1 {
		writeError(w, http.StatusBadRequest, "invalid request")
		return
	}

	row, err := h.friends.Get(r.Context(), id)
	if errors.Is(err, repository.ErrRequestNotFound) {
		writeError(w, http.StatusNotFound, "request not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update request")
		return
	}

	if accept {
		err = h.friends.Accept(r.Context(), id, user.ID)
	} else {
		err = h.friends.Reject(r.Context(), id, user.ID)
	}
	if errors.Is(err, repository.ErrRequestNotFound) {
		writeError(w, http.StatusNotFound, "request not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update request")
		return
	}

	h.events.Notify(row.RequesterID, row.AddresseeID)
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (h *Handler) authorizedFriend(w http.ResponseWriter, r *http.Request, userID int64) (int64, bool) {
	friendID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || friendID < 1 {
		writeError(w, http.StatusBadRequest, "invalid friend")
		return 0, false
	}
	if friendID == userID {
		writeError(w, http.StatusBadRequest, "invalid friend")
		return 0, false
	}

	ok, err := h.friends.AreFriends(r.Context(), userID, friendID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load friend")
		return 0, false
	}
	if !ok {
		writeError(w, http.StatusNotFound, "friend not found")
		return 0, false
	}
	return friendID, true
}
