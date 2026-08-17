package handler

import (
	"database/sql"

	"bprime/internal/repository"
)

type Handler struct {
	db    *sql.DB
	items *repository.ItemRepository
}

func New(db *sql.DB, items *repository.ItemRepository) *Handler {
	return &Handler{db: db, items: items}
}
