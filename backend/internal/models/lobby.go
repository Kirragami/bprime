package models

type LobbyResult struct {
	Index    int    `json:"index"`
	TimeMs   int64  `json:"timeMs"`
	Scramble string `json:"scramble"`
}

type LobbyMember struct {
	User      User          `json:"user"`
	State     string        `json:"state"`
	Results   []LobbyResult `json:"results"`
	StartedAt int64         `json:"startedAt,omitempty"`
}

type Lobby struct {
	ID           int64         `json:"id"`
	HostID       int64         `json:"hostId"`
	Status       string        `json:"status"`
	AttemptIndex int           `json:"attemptIndex"`
	Scramble     string        `json:"scramble"`
	Members      []LobbyMember `json:"members"`
	CreatedAt    string        `json:"createdAt"`
	NowMs        int64         `json:"nowMs,omitempty"`
}
