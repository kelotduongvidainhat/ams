package ws

import (
	"log"
	"sync"
	"encoding/json"

	"github.com/gofiber/contrib/websocket"
)

// Client represents a connected websocket client
type Client struct {
	Conn *websocket.Conn
}

// Hub maintains the set of active clients and broadcasts messages
type Hub struct {
	// Registered clients.
	Clients map[*Client]bool

	// Inbound messages from the clients.
	Broadcast chan []byte

	// Register requests from the clients.
	Register chan *Client

	// Unregister requests from clients.
	Unregister chan *Client

	// Mutex to protect Clients map
	mu sync.Mutex
}

// GlobalHub is the singleton hub
var GlobalHub *Hub

// InitHub initializes the GlobalHub
func InitHub() *Hub {
	GlobalHub = &Hub{
		Broadcast:  make(chan []byte),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Clients:    make(map[*Client]bool),
	}
	return GlobalHub
}

// Run handles the hub's main loop
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			h.Clients[client] = true
			h.mu.Unlock()
			log.Println("🔌 WebSocket Client Connected")

		case client := <-h.Unregister:
			h.mu.Lock()
			if _, ok := h.Clients[client]; ok {
				delete(h.Clients, client)
				client.Conn.Close()
				log.Println("🔌 WebSocket Client Disconnected")
			}
			h.mu.Unlock()

		case message := <-h.Broadcast:
			h.mu.Lock()
			for client := range h.Clients {
				if err := client.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
					log.Printf("⚠️ WebSocket Write Error: %v", err)
					client.Conn.Close()
					delete(h.Clients, client)
				}
			}
			h.mu.Unlock()
		}
	}
}

// BroadcastEvent helper to send JSON events
func BroadcastEvent(eventType string, data interface{}) {
	if GlobalHub == nil {
		return
	}

	msg := map[string]interface{}{
		"type": eventType,
		"data": data,
	}

	jsonMsg, err := json.Marshal(msg)
	if err != nil {
		log.Printf("❌ Failed to marshal WS message: %v", err)
		return
	}

	GlobalHub.Broadcast <- jsonMsg
}
