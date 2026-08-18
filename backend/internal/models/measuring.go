package models

type Attempt struct {
	Index    int    `json:"index"`
	TimeMs   int64  `json:"timeMs"`
	Scramble string `json:"scramble"`
}

type Measuring struct {
	ID           int64     `json:"id"`
	Mode         string    `json:"mode"`
	AverageMs    int64     `json:"averageMs"`
	Attempts     []Attempt `json:"attempts"`
	AttemptCount int       `json:"attemptCount"`
	LobbyID      int64     `json:"lobbyId,omitempty"`
	CreatedAt    string    `json:"createdAt"`
}

type BestTime struct {
	TimeMs    int64  `json:"timeMs"`
	CreatedAt string `json:"createdAt"`
}
