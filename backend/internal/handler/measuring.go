package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"bprime/internal/models"
	"bprime/internal/repository"
)

type createMeasuringRequest struct {
	Mode     string           `json:"mode"`
	Attempts []models.Attempt `json:"attempts"`
}

func (h *Handler) CreateMeasuring(w http.ResponseWriter, r *http.Request) {
	user, ok := h.userFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "not signed in")
		return
	}

	var req createMeasuringRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	item, err := h.measurings.Create(r.Context(), user.ID, req.Mode, req.Attempts)
	if errors.Is(err, repository.ErrInvalidMode) {
		writeError(w, http.StatusBadRequest, "invalid mode")
		return
	}
	if errors.Is(err, repository.ErrInvalidMeasuring) {
		writeError(w, http.StatusBadRequest, "need 5 valid attempts")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save measuring")
		return
	}

	writeJSON(w, http.StatusCreated, item)
}
