package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"bprime/internal/models"
	"bprime/internal/repository"
)

type inviteLobbyRequest struct {
	UserID int64 `json:"userId"`
}

type scrambleLobbyRequest struct {
	Scramble string `json:"scramble"`
}

type timeLobbyRequest struct {
	TimeMs int64 `json:"timeMs"`
}

func (h *Handler) CreateLobby(w http.ResponseWriter, r *http.Request) {
	user, ok := h.userFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "not signed in")
		return
	}

	item, err := h.lobbies.Create(r.Context(), user.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create lobby")
		return
	}
	h.notifyLobby(item)
	writeJSON(w, http.StatusCreated, item)
}

func (h *Handler) CurrentLobby(w http.ResponseWriter, r *http.Request) {
	user, ok := h.userFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "not signed in")
		return
	}

	item, err := h.lobbies.Current(r.Context(), user.ID)
	if errors.Is(err, repository.ErrLobbyNotFound) {
		writeJSON(w, http.StatusOK, nil)
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load lobby")
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (h *Handler) GetLobby(w http.ResponseWriter, r *http.Request) {
	user, ok := h.userFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "not signed in")
		return
	}
	id, ok := lobbyID(r)
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid lobby")
		return
	}

	item, err := h.lobbies.Get(r.Context(), id)
	if errors.Is(err, repository.ErrLobbyNotFound) {
		writeError(w, http.StatusNotFound, "lobby not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load lobby")
		return
	}
	if !canSeeLobby(item, user.ID) {
		writeError(w, http.StatusNotFound, "lobby not found")
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (h *Handler) InviteToLobby(w http.ResponseWriter, r *http.Request) {
	h.mutateLobby(w, r, func(userID, id int64) (models.Lobby, error) {
		var req inviteLobbyRequest
		if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&req); err != nil {
			return models.Lobby{}, errInvalidJSON
		}
		if req.UserID < 1 {
			return models.Lobby{}, errInvalidJSON
		}
		return h.lobbies.Invite(r.Context(), id, userID, req.UserID)
	})
}

func (h *Handler) JoinLobby(w http.ResponseWriter, r *http.Request) {
	h.mutateLobby(w, r, func(userID, id int64) (models.Lobby, error) {
		return h.lobbies.Join(r.Context(), id, userID)
	})
}

func (h *Handler) LeaveLobby(w http.ResponseWriter, r *http.Request) {
	h.mutateLobby(w, r, func(userID, id int64) (models.Lobby, error) {
		return h.lobbies.Leave(r.Context(), id, userID)
	})
}

func (h *Handler) SetLobbyScramble(w http.ResponseWriter, r *http.Request) {
	h.mutateLobby(w, r, func(userID, id int64) (models.Lobby, error) {
		var req scrambleLobbyRequest
		if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&req); err != nil {
			return models.Lobby{}, errInvalidJSON
		}
		return h.lobbies.SetScramble(r.Context(), id, userID, req.Scramble)
	})
}

func (h *Handler) SubmitLobbyTime(w http.ResponseWriter, r *http.Request) {
	h.mutateLobby(w, r, func(userID, id int64) (models.Lobby, error) {
		var req timeLobbyRequest
		if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&req); err != nil {
			return models.Lobby{}, errInvalidJSON
		}
		return h.lobbies.SubmitTime(r.Context(), id, userID, req.TimeMs)
	})
}

var errInvalidJSON = errors.New("invalid json")

func (h *Handler) mutateLobby(w http.ResponseWriter, r *http.Request, fn func(userID, id int64) (models.Lobby, error)) {
	user, ok := h.userFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "not signed in")
		return
	}
	id, ok := lobbyID(r)
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid lobby")
		return
	}

	item, err := fn(user.ID, id)
	if err != nil {
		writeLobbyError(w, err)
		return
	}
	_ = h.measurings.SaveLobby(r.Context(), item)
	h.notifyLobby(item)
	writeJSON(w, http.StatusOK, item)
}

func writeLobbyError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, errInvalidJSON):
		writeError(w, http.StatusBadRequest, "invalid json")
	case errors.Is(err, repository.ErrLobbyNotFound):
		writeError(w, http.StatusNotFound, "lobby not found")
	case errors.Is(err, repository.ErrLobbyForbidden):
		writeError(w, http.StatusForbidden, "not allowed")
	case errors.Is(err, repository.ErrNotFriends):
		writeError(w, http.StatusForbidden, "not friends")
	case errors.Is(err, repository.ErrLobbyBusy):
		writeError(w, http.StatusConflict, "already in a lobby")
	case errors.Is(err, repository.ErrLobbyConflict):
		writeError(w, http.StatusConflict, "already invited")
	case errors.Is(err, repository.ErrLobbyClosed):
		writeError(w, http.StatusConflict, "lobby already started")
	case errors.Is(err, repository.ErrLobbyNotReady):
		writeError(w, http.StatusConflict, "not ready")
	case errors.Is(err, repository.ErrLobbyAlone):
		writeError(w, http.StatusConflict, "need another player")
	case errors.Is(err, repository.ErrLobbyDuplicate):
		writeError(w, http.StatusConflict, "already submitted")
	case errors.Is(err, repository.ErrInvalidScramble):
		writeError(w, http.StatusBadRequest, "scramble required")
	case errors.Is(err, repository.ErrInvalidTime):
		writeError(w, http.StatusBadRequest, "invalid time")
	default:
		writeError(w, http.StatusInternalServerError, "failed to update lobby")
	}
}

func (h *Handler) notifyLobby(item models.Lobby) {
	payload, err := json.Marshal(map[string]any{
		"type":    "lobby",
		"lobbyId": item.ID,
	})
	if err != nil {
		return
	}
	h.events.Publish("lobby", payload, h.lobbies.MemberIDs(item)...)
}

func canSeeLobby(item models.Lobby, userID int64) bool {
	if item.HostID == userID {
		return true
	}
	for _, member := range item.Members {
		if member.User.ID == userID {
			return true
		}
	}
	return false
}

func lobbyID(r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	return id, err == nil && id > 0
}
