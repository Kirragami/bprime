package handler

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"io"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"regexp"
)

const maxAvatarBytes = 5 << 20

var avatarNamePattern = regexp.MustCompile(`^[a-zA-Z0-9._-]+$`)

var avatarTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
	"image/gif":  ".gif",
}

func (h *Handler) UploadAvatar(w http.ResponseWriter, r *http.Request) {
	user, ok := h.userFromRequest(r)
	if !ok {
		writeError(w, http.StatusUnauthorized, "not signed in")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxAvatarBytes+1024)
	if err := r.ParseMultipartForm(maxAvatarBytes); err != nil {
		writeError(w, http.StatusRequestEntityTooLarge, "image must be 5MB or smaller")
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "image is required")
		return
	}
	defer file.Close()

	head := make([]byte, 512)
	n, err := io.ReadFull(file, head)
	if err != nil && !errors.Is(err, io.ErrUnexpectedEOF) && !errors.Is(err, io.EOF) {
		writeError(w, http.StatusBadRequest, "could not read image")
		return
	}
	head = head[:n]

	ext, ok := avatarTypes[http.DetectContentType(head)]
	if !ok {
		writeError(w, http.StatusBadRequest, "use a jpg, png, webp, or gif")
		return
	}

	var token [8]byte
	if _, err := rand.Read(token[:]); err != nil {
		writeError(w, http.StatusInternalServerError, "could not save image")
		return
	}

	name := hex.EncodeToString(token[:]) + ext
	dest := filepath.Join(h.uploadDir, name)
	out, err := os.Create(dest)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not save image")
		return
	}

	written, err := io.Copy(out, io.MultiReader(bytes.NewReader(head), file))
	closeErr := out.Close()
	if err != nil || closeErr != nil {
		_ = os.Remove(dest)
		if errors.Is(err, http.ErrBodyReadAfterClose) || isMaxBytes(err) {
			writeError(w, http.StatusRequestEntityTooLarge, "image must be 5MB or smaller")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not save image")
		return
	}
	if written > maxAvatarBytes {
		_ = os.Remove(dest)
		writeError(w, http.StatusRequestEntityTooLarge, "image must be 5MB or smaller")
		return
	}

	url := "/api/avatars/" + name
	previous := user.AvatarURL
	if err := h.users.SetAvatar(r.Context(), user.ID, url); err != nil {
		_ = os.Remove(dest)
		writeError(w, http.StatusInternalServerError, "could not save image")
		return
	}
	removeAvatarFile(h.uploadDir, previous)

	user.AvatarURL = url
	writeJSON(w, http.StatusOK, user)
}

func (h *Handler) ServeAvatar(w http.ResponseWriter, r *http.Request) {
	name := path.Base(r.PathValue("name"))
	if !avatarNamePattern.MatchString(name) {
		http.NotFound(w, r)
		return
	}

	w.Header().Set("Cache-Control", "public, max-age=86400")
	http.ServeFile(w, r, filepath.Join(h.uploadDir, name))
}

func removeAvatarFile(dir, url string) {
	name := path.Base(url)
	if !avatarNamePattern.MatchString(name) {
		return
	}
	_ = os.Remove(filepath.Join(dir, name))
}

func isMaxBytes(err error) bool {
	var maxErr *http.MaxBytesError
	return errors.As(err, &maxErr)
}
