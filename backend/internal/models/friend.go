package models

type FriendRequest struct {
	ID        int64  `json:"id"`
	User      User   `json:"user"`
	CreatedAt string `json:"createdAt"`
}

type FriendGraph struct {
	Friends  []User          `json:"friends"`
	Incoming []FriendRequest `json:"incoming"`
	Outgoing []FriendRequest `json:"outgoing"`
}
