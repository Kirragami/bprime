package handler

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"

	"bprime/internal/models"
	"bprime/internal/repository"
)

const oauthStateCookie = "bprime_oauth_state"

type googleUserInfo struct {
	ID      string `json:"id"`
	Email   string `json:"email"`
	Picture string `json:"picture"`
	Name    string `json:"name"`
}

func (h *Handler) GoogleLogin(w http.ResponseWriter, r *http.Request) {
	if h.googleClientID == "" || h.googleClientSecret == "" || h.googleRedirectURL == "" {
		writeError(w, http.StatusServiceUnavailable, "google sign-in not configured")
		return
	}

	state, err := randomOAuthState()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not start google sign-in")
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     oauthStateCookie,
		Value:    state,
		Path:     "/",
		MaxAge:   600,
		HttpOnly: true,
		Secure:   h.cookieSecure,
		SameSite: http.SameSiteLaxMode,
	})

	url := h.googleOAuthConfig().AuthCodeURL(state, oauth2.AccessTypeOnline)
	http.Redirect(w, r, url, http.StatusFound)
}

func (h *Handler) GoogleCallback(w http.ResponseWriter, r *http.Request) {
	if h.googleClientID == "" || h.googleClientSecret == "" || h.googleRedirectURL == "" {
		h.redirectApp(w, r, "/?auth_error=google")
		return
	}

	stateCookie, err := r.Cookie(oauthStateCookie)
	if err != nil || stateCookie.Value == "" || stateCookie.Value != r.URL.Query().Get("state") {
		h.redirectApp(w, r, "/?auth_error=google")
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     oauthStateCookie,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   h.cookieSecure,
		SameSite: http.SameSiteLaxMode,
	})

	code := r.URL.Query().Get("code")
	if code == "" {
		h.redirectApp(w, r, "/?auth_error=google")
		return
	}

	token, err := h.googleOAuthConfig().Exchange(r.Context(), code)
	if err != nil {
		h.redirectApp(w, r, "/?auth_error=google")
		return
	}

	info, err := fetchGoogleUserInfo(r.Context(), token.AccessToken)
	if err != nil || info.ID == "" {
		h.redirectApp(w, r, "/?auth_error=google")
		return
	}

	user, err := h.users.GetByGoogleID(r.Context(), info.ID)
	if errors.Is(err, repository.ErrUserNotFound) {
		user, err = h.users.CreateGoogleUser(r.Context(), info.ID, info.Picture)
		if err != nil {
			h.redirectApp(w, r, "/?auth_error=google")
			return
		}
	} else if err != nil {
		h.redirectApp(w, r, "/?auth_error=google")
		return
	}

	if err := h.startSession(w, r, user.ID); err != nil {
		h.redirectApp(w, r, "/?auth_error=google")
		return
	}

	if user.NeedsUsername {
		h.redirectApp(w, r, "/?pick_username=1")
		return
	}
	h.redirectApp(w, r, "/")
}

func (h *Handler) googleOAuthConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     h.googleClientID,
		ClientSecret: h.googleClientSecret,
		RedirectURL:  h.googleRedirectURL,
		Scopes:       []string{"openid", "email", "profile"},
		Endpoint:     google.Endpoint,
	}
}

func (h *Handler) redirectApp(w http.ResponseWriter, r *http.Request, path string) {
	target := h.appOrigin + path
	http.Redirect(w, r, target, http.StatusFound)
}

func fetchGoogleUserInfo(ctx context.Context, accessToken string) (googleUserInfo, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://www.googleapis.com/oauth2/v2/userinfo", nil)
	if err != nil {
		return googleUserInfo{}, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return googleUserInfo{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return googleUserInfo{}, fmt.Errorf("google userinfo: %s", resp.Status)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return googleUserInfo{}, err
	}

	var info googleUserInfo
	if err := json.Unmarshal(body, &info); err != nil {
		return googleUserInfo{}, err
	}
	return info, nil
}

func randomOAuthState() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func userResponse(user models.User) models.User {
	if user.NeedsUsername {
		user.Username = ""
	}
	return user
}
