package repository

import (
	"context"
	"database/sql"
	"fmt"

	"bprime/internal/models"
)

type ItemRepository struct {
	db *sql.DB
}

func NewItemRepository(db *sql.DB) *ItemRepository {
	return &ItemRepository{db: db}
}

func (r *ItemRepository) List(ctx context.Context) ([]models.Item, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, title, created_at
		FROM items
		ORDER BY id DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("list items: %w", err)
	}
	defer rows.Close()

	items := make([]models.Item, 0)
	for rows.Next() {
		var item models.Item
		if err := rows.Scan(&item.ID, &item.Title, &item.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan item: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate items: %w", err)
	}

	return items, nil
}

func (r *ItemRepository) Create(ctx context.Context, title string) (models.Item, error) {
	result, err := r.db.ExecContext(ctx, `INSERT INTO items (title) VALUES (?)`, title)
	if err != nil {
		return models.Item{}, fmt.Errorf("insert item: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return models.Item{}, fmt.Errorf("item id: %w", err)
	}

	var item models.Item
	err = r.db.QueryRowContext(ctx, `
		SELECT id, title, created_at
		FROM items
		WHERE id = ?
	`, id).Scan(&item.ID, &item.Title, &item.CreatedAt)
	if err != nil {
		return models.Item{}, fmt.Errorf("load item: %w", err)
	}

	return item, nil
}
