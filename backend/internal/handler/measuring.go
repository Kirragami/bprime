package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

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

func (h *Handler) ListMeasurings(w http.ResponseWriter, r *http.Request) {
	user, ok := h.userFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "not signed in")
		return
	}

	items, err := h.measurings.List(r.Context(), user.ID, 50)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load history")
		return
	}

	writeJSON(w, http.StatusOK, items)
}

func (h *Handler) GetMeasuring(w http.ResponseWriter, r *http.Request) {
	user, ok := h.userFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "not signed in")
		return
	}

	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id < 1 {
		writeError(w, http.StatusBadRequest, "invalid measuring")
		return
	}

	item, err := h.measurings.Get(r.Context(), user.ID, id)
	if errors.Is(err, repository.ErrInvalidMeasuring) {
		writeError(w, http.StatusNotFound, "measuring not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load measuring")
		return
	}

	writeJSON(w, http.StatusOK, item)
}

func (h *Handler) ListBestTimes(w http.ResponseWriter, r *http.Request) {
	user, ok := h.userFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "not signed in")
		return
	}

	items, err := h.measurings.BestTimes(r.Context(), user.ID, 5)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load times")
		return
	}

	writeJSON(w, http.StatusOK, items)
}
