package models

type Attempt struct {
	Index    int    `json:"index"`
	TimeMs   int64  `json:"timeMs"`
	Scramble string `json:"scramble"`
}

type Measuring struct {
	ID        int64     `json:"id"`
	Mode      string    `json:"mode"`
	AverageMs int64     `json:"averageMs"`
	Attempts  []Attempt `json:"attempts"`
	CreatedAt string    `json:"createdAt"`
}
