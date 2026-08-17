package models

type User struct {
	ID        int64  `json:"id"`
	Username  string `json:"username"`
	CreatedAt string `json:"createdAt"`
}

type UserRecord struct {
	User
	PasswordHash string
}
