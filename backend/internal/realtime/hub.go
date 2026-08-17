package realtime

import "sync"

type Hub struct {
	mu   sync.Mutex
	subs map[int64]map[chan []byte]struct{}
}

func NewHub() *Hub {
	return &Hub{subs: make(map[int64]map[chan []byte]struct{})}
}

func (h *Hub) Subscribe(userID int64) chan []byte {
	ch := make(chan []byte, 4)
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.subs[userID] == nil {
		h.subs[userID] = make(map[chan []byte]struct{})
	}
	h.subs[userID][ch] = struct{}{}
	return ch
}

func (h *Hub) Unsubscribe(userID int64, ch chan []byte) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if subs := h.subs[userID]; subs != nil {
		delete(subs, ch)
		if len(subs) == 0 {
			delete(h.subs, userID)
		}
	}
	close(ch)
}

func (h *Hub) Notify(userIDs ...int64) {
	payload := []byte(`{"type":"friends"}`)
	seen := make(map[int64]struct{}, len(userIDs))

	h.mu.Lock()
	defer h.mu.Unlock()

	for _, userID := range userIDs {
		if _, ok := seen[userID]; ok {
			continue
		}
		seen[userID] = struct{}{}
		for ch := range h.subs[userID] {
			select {
			case ch <- payload:
			default:
			}
		}
	}
}
