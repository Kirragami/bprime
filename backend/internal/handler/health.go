package handler

import (
	"net/http"

	"bprime/internal/models"
)

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	status := models.Health{
		Status:   "ok",
		Database: "ok",
	}

	if err := h.db.PingContext(r.Context()); err != nil {
		status.Status = "degraded"
		status.Database = "unavailable"
		writeJSON(w, http.StatusServiceUnavailable, status)
		return
	}

	writeJSON(w, http.StatusOK, status)
}
