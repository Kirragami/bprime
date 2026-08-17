package main

import (
	"log"
	"net/http"

	"github.com/joho/godotenv"

	"bprime/internal/config"
	"bprime/internal/database"
	"bprime/internal/handler"
	"bprime/internal/repository"
	"bprime/internal/router"
)

func main() {
	_ = godotenv.Load()
	cfg := config.Load()

	db, err := database.Open(cfg.DatabasePath)
	if err != nil {
		log.Fatalf("open database: %v", err)
	}
	defer db.Close()

	if err := database.Migrate(db); err != nil {
		log.Fatalf("migrate database: %v", err)
	}

	itemRepo := repository.NewItemRepository(db)
	handlers := handler.New(db, itemRepo)
	mux := router.New(cfg, handlers)

	log.Printf("api listening on :%s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, mux); err != nil {
		log.Fatalf("server: %v", err)
	}
}
