package handler

import (
	"encoding/json"
	"net/http"
	"strings"
)

type createItemRequest struct {
	Title string `json:"title"`
}

func (h *Handler) ListItems(w http.ResponseWriter, r *http.Request) {
	items, err := h.items.List(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list items")
		return
	}

	writeJSON(w, http.StatusOK, items)
}

func (h *Handler) CreateItem(w http.ResponseWriter, r *http.Request) {
	var req createItemRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	title := strings.TrimSpace(req.Title)
	if title == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}

	item, err := h.items.Create(r.Context(), title)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create item")
		return
	}

	writeJSON(w, http.StatusCreated, item)
}
