package database

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

func Open(path string) (*sql.DB, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, fmt.Errorf("create data directory: %w", err)
	}

	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}

	if _, err := db.Exec(`PRAGMA foreign_keys = ON`); err != nil {
		db.Close()
		return nil, fmt.Errorf("enable foreign keys: %w", err)
	}
	if _, err := db.Exec(`PRAGMA journal_mode = WAL`); err != nil {
		db.Close()
		return nil, fmt.Errorf("enable wal: %w", err)
	}
	if _, err := db.Exec(`PRAGMA busy_timeout = 5000`); err != nil {
		db.Close()
		return nil, fmt.Errorf("set busy timeout: %w", err)
	}

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("ping sqlite: %w", err)
	}

	return db, nil
}

func Migrate(db *sql.DB) error {
	const schema = `
CREATE TABLE IF NOT EXISTS items (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	title TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	username TEXT NOT NULL COLLATE NOCASE,
	password_hash TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_idx ON users (username);

CREATE TABLE IF NOT EXISTS sessions (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	token_hash TEXT NOT NULL UNIQUE,
	user_id INTEGER NOT NULL,
	expires_at TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
	FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions (expires_at);

`

	if _, err := db.Exec(schema); err != nil {
		return fmt.Errorf("apply schema: %w", err)
	}
	if err := migrateFriendships(db); err != nil {
		return err
	}
	return nil
}

func migrateFriendships(db *sql.DB) error {
	const create = `
CREATE TABLE IF NOT EXISTS friendships (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	requester_id INTEGER NOT NULL,
	addressee_id INTEGER NOT NULL,
	status TEXT NOT NULL CHECK (status IN ('pending', 'accepted')),
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
	FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
	FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS friendships_pair_idx
	ON friendships (MIN(requester_id, addressee_id), MAX(requester_id, addressee_id));
CREATE INDEX IF NOT EXISTS friendships_addressee_idx ON friendships (addressee_id, status);
CREATE INDEX IF NOT EXISTS friendships_requester_idx ON friendships (requester_id, status);
`

	var table string
	err := db.QueryRow(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'friendships'`).Scan(&table)
	if err != nil {
		if err == sql.ErrNoRows {
			if _, err := db.Exec(create); err != nil {
				return fmt.Errorf("create friendships: %w", err)
			}
			return nil
		}
		return fmt.Errorf("lookup friendships: %w", err)
	}

	rows, err := db.Query(`PRAGMA table_info(friendships)`)
	if err != nil {
		return fmt.Errorf("inspect friendships: %w", err)
	}
	defer rows.Close()

	hasStatus := false
	for rows.Next() {
		var cid int
		var name, colType string
		var notNull, pk int
		var dflt sql.NullString
		if err := rows.Scan(&cid, &name, &colType, &notNull, &dflt, &pk); err != nil {
			return fmt.Errorf("scan friendships column: %w", err)
		}
		if name == "status" {
			hasStatus = true
		}
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate friendships columns: %w", err)
	}
	if hasStatus {
		if _, err := db.Exec(create); err != nil {
			return fmt.Errorf("ensure friendships indexes: %w", err)
		}
		return nil
	}

	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("begin friendships migrate: %w", err)
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`ALTER TABLE friendships RENAME TO friendships_legacy`); err != nil {
		return fmt.Errorf("rename legacy friendships: %w", err)
	}
	if _, err := tx.Exec(create); err != nil {
		return fmt.Errorf("create friendships: %w", err)
	}
	if _, err := tx.Exec(`
		INSERT OR IGNORE INTO friendships (requester_id, addressee_id, status, created_at)
		SELECT user_id, friend_id, 'accepted', created_at FROM friendships_legacy
	`); err != nil {
		return fmt.Errorf("copy legacy friendships: %w", err)
	}
	if _, err := tx.Exec(`DROP TABLE friendships_legacy`); err != nil {
		return fmt.Errorf("drop legacy friendships: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit friendships migrate: %w", err)
	}
	return nil
}
