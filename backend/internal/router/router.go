package router

import (
	"net/http"

	"bprime/internal/config"
	"bprime/internal/handler"
	"bprime/internal/middleware"
)

func New(cfg config.Config, h *handler.Handler) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/health", h.Health)
	mux.HandleFunc("GET /api/items", h.ListItems)
	mux.HandleFunc("POST /api/items", h.CreateItem)

	var handler http.Handler = mux
	handler = middleware.Logging(handler)
	handler = middleware.Recover(handler)
	handler = middleware.CORS(cfg.CORSOrigin)(handler)

	return handler
}
