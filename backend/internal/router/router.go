package router

import (
	"net/http"
	"os"
	"strings"

	"bprime/internal/config"
	"bprime/internal/handler"
	"bprime/internal/middleware"
)

func New(cfg config.Config, h *handler.Handler) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/health", h.Health)
	mux.HandleFunc("GET /api/items", h.ListItems)
	mux.HandleFunc("POST /api/items", h.CreateItem)
	mux.HandleFunc("POST /api/register", h.Register)
	mux.HandleFunc("POST /api/login", h.Login)
	mux.HandleFunc("POST /api/logout", h.Logout)
	mux.HandleFunc("GET /api/me", h.Me)
	mux.HandleFunc("POST /api/me/avatar", h.UploadAvatar)
	mux.HandleFunc("GET /api/avatars/{name}", h.ServeAvatar)
	mux.HandleFunc("GET /api/friends", h.ListFriends)
	mux.HandleFunc("POST /api/friends", h.AddFriend)
	mux.HandleFunc("POST /api/friends/{id}/accept", h.AcceptFriend)
	mux.HandleFunc("POST /api/friends/{id}/reject", h.RejectFriend)
	mux.HandleFunc("GET /api/events", h.Events)
	mux.HandleFunc("POST /api/lobbies", h.CreateLobby)
	mux.HandleFunc("GET /api/lobbies/current", h.CurrentLobby)
	mux.HandleFunc("GET /api/lobbies/{id}", h.GetLobby)
	mux.HandleFunc("POST /api/lobbies/{id}/invites", h.InviteToLobby)
	mux.HandleFunc("POST /api/lobbies/{id}/join", h.JoinLobby)
	mux.HandleFunc("POST /api/lobbies/{id}/leave", h.LeaveLobby)
	mux.HandleFunc("POST /api/lobbies/{id}/scramble", h.SetLobbyScramble)
	mux.HandleFunc("POST /api/lobbies/{id}/time", h.SubmitLobbyTime)
	mux.HandleFunc("POST /api/lobbies/{id}/clock", h.StartLobbyClock)
	mux.HandleFunc("POST /api/measurings", h.CreateMeasuring)
	mux.HandleFunc("GET /api/measurings", h.ListMeasurings)
	mux.HandleFunc("GET /api/leaders", h.ListLeaders)
	mux.HandleFunc("GET /api/measurings/bests", h.ListBestTimes)
	mux.HandleFunc("GET /api/measurings/{id}", h.GetMeasuring)
	mux.HandleFunc("/api/", http.NotFound)

	if dir := strings.TrimSpace(cfg.StaticDir); dir != "" {
		if info, err := os.Stat(dir); err == nil && info.IsDir() {
			mux.Handle("/", spaFileServer(dir))
		}
	}

	var handler http.Handler = mux
	handler = middleware.Logging(handler)
	handler = middleware.Recover(handler)
	handler = middleware.CORS(cfg.CORSOrigin)(handler)

	return handler
}

func spaFileServer(dir string) http.Handler {
	fs := http.Dir(dir)
	fileServer := http.FileServer(fs)

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		file, err := fs.Open(r.URL.Path)
		if err == nil {
			info, statErr := file.Stat()
			file.Close()
			if statErr == nil && !info.IsDir() {
				if strings.HasSuffix(r.URL.Path, ".html") || r.URL.Path == "/" {
					w.Header().Set("Cache-Control", "no-store")
				}
				fileServer.ServeHTTP(w, r)
				return
			}
		}

		w.Header().Set("Cache-Control", "no-store")
		r.URL.Path = "/"
		fileServer.ServeHTTP(w, r)
	})
}
