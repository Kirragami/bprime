package models

type User struct {
	ID        int64  `json:"id"`
	Username  string `json:"username"`
	AvatarURL string `json:"avatarUrl,omitempty"`
	CreatedAt string `json:"createdAt"`
	BestMs    int64  `json:"bestMs,omitempty"`
}

type UserRecord struct {
	User
	PasswordHash string
}
