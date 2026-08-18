package realtime

import "sync"

type Event struct {
	Name string
	Data []byte
}

type Hub struct {
	mu   sync.Mutex
	subs map[int64]map[chan Event]struct{}
}

func NewHub() *Hub {
	return &Hub{subs: make(map[int64]map[chan Event]struct{})}
}

func (h *Hub) Subscribe(userID int64) chan Event {
	ch := make(chan Event, 16)
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.subs[userID] == nil {
		h.subs[userID] = make(map[chan Event]struct{})
	}
	h.subs[userID][ch] = struct{}{}
	return ch
}

func (h *Hub) Unsubscribe(userID int64, ch chan Event) {
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

func (h *Hub) Publish(name string, data []byte, userIDs ...int64) {
	seen := make(map[int64]struct{}, len(userIDs))
	event := Event{Name: name, Data: data}

	h.mu.Lock()
	defer h.mu.Unlock()

	for _, userID := range userIDs {
		if _, ok := seen[userID]; ok {
			continue
		}
		seen[userID] = struct{}{}
		for ch := range h.subs[userID] {
			select {
			case ch <- event:
			default:
			}
		}
	}
}

func (h *Hub) Notify(userIDs ...int64) {
	h.Publish("friends", []byte(`{"type":"friends"}`), userIDs...)
}
