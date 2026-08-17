package models

type User struct {
	ID        int64  `json:"id"`
	Username  string `json:"username"`
	AvatarURL string `json:"avatarUrl,omitempty"`
	CreatedAt string `json:"createdAt"`
}

type UserRecord struct {
	User
	PasswordHash string
}
