package ws

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"transcendance/backend/src/auth"
	"transcendance/backend/src/game"
	"transcendance/backend/src/handlers"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // CORS handled at HTTP level
	},
}

type Client struct {
	UserID   int
	Username string
	Conn     *websocket.Conn
	Hub      *Hub
	Send     chan []byte
}

type Hub struct {
	mu           sync.RWMutex
	clients      map[int]*Client
	onlineUsers  map[int]bool
	db           *sql.DB
	games        map[string]*game.PongGame
	matchQueue   []int // user IDs waiting for match
	invites      map[string]*GameInvite
	broadcast    chan BroadcastMsg
	register     chan *Client
	unregister   chan *Client
}

type GameInvite struct {
	ID        string
	FromID    int
	FromUser  string
	ToID      int
	CreatedAt time.Time
}

type BroadcastMsg struct {
	Type      string      `json:"type"`
	UserID    int         `json:"user_id,omitempty"`
	Username  string      `json:"username,omitempty"`
	Content   string      `json:"content,omitempty"`
	Data      interface{} `json:"data,omitempty"`
	TargetID  int         `json:"-"`
}

type WSMessage struct {
	Type      string  `json:"type"`
	Content   string  `json:"content,omitempty"`
	TargetID  int     `json:"target_id,omitempty"`
	TargetUser string `json:"target_user,omitempty"`
	Direction float64 `json:"direction,omitempty"`
	GameID    string  `json:"game_id,omitempty"`
	InviteID  string  `json:"invite_id,omitempty"`
	MessageID int     `json:"message_id,omitempty"`
}

func NewHub(db *sql.DB) *Hub {
	return &Hub{
		clients:     make(map[int]*Client),
		onlineUsers: make(map[int]bool),
		db:          db,
		games:       make(map[string]*game.PongGame),
		matchQueue:  []int{},
		invites:     make(map[string]*GameInvite),
		broadcast:   make(chan BroadcastMsg, 256),
		register:    make(chan *Client),
		unregister:  make(chan *Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			if existing, ok := h.clients[client.UserID]; ok && existing != client {
				// Replace stale duplicate sessions for the same user so events always route to latest tab.
				close(existing.Send)
				existing.Conn.Close()
			}
			h.clients[client.UserID] = client
			h.onlineUsers[client.UserID] = true
			h.mu.Unlock()
			h.notifyOnlineStatus(client.UserID, true)
			h.resumeGameIfPaused(client)
			h.replayCurrentGameState(client)
			_, _ = h.db.Exec(`UPDATE users SET last_seen = NOW() WHERE id = $1`, client.UserID)

		case client := <-h.unregister:
			h.mu.Lock()
			if current, ok := h.clients[client.UserID]; ok && current == client {
				delete(h.clients, client.UserID)
				delete(h.onlineUsers, client.UserID)
				close(client.Send)
				h.mu.Unlock()
				h.notifyOnlineStatus(client.UserID, false)
				h.handleDisconnect(client.UserID)
				continue
			}
			h.mu.Unlock()

		case msg := <-h.broadcast:
			h.dispatch(msg)
		}
	}
}

func (h *Hub) OnlineUsers() map[int]bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	copy := make(map[int]bool, len(h.onlineUsers))
	for k, v := range h.onlineUsers {
		copy[k] = v
	}
	return copy
}

// NotifyUser lets other packages (e.g. REST handlers) push a realtime event
// to a specific connected user without depending on internal hub types.
func (h *Hub) NotifyUser(userID int, msgType string, data interface{}) {
	h.sendToUser(userID, BroadcastMsg{Type: msgType, Data: data})
}

func (h *Hub) notifyOnlineStatus(userID int, online bool) {
	h.broadcastToFriends(userID, BroadcastMsg{
		Type:     "presence",
		UserID:   userID,
		Data:     map[string]interface{}{"online": online},
	})
}

func (h *Hub) broadcastToFriends(userID int, msg BroadcastMsg) {
	rows, err := h.db.Query(`
		SELECT CASE WHEN user_id = $1 THEN friend_id ELSE user_id END
		FROM friendships WHERE (user_id = $1 OR friend_id = $1) AND status = 'accepted'
	`, userID)
	if err != nil {
		return
	}
	defer rows.Close()

	for rows.Next() {
		var friendID int
		if err := rows.Scan(&friendID); err != nil {
			continue
		}
		h.sendToUser(friendID, msg)
	}
}

func (h *Hub) sendToUser(userID int, msg BroadcastMsg) {
	h.mu.RLock()
	client, ok := h.clients[userID]
	h.mu.RUnlock()
	if !ok {
		return
	}
	h.sendToClient(client, msg)
}

func (h *Hub) sendToUserLocked(userID int, msg BroadcastMsg) {
	client, ok := h.clients[userID]
	if !ok {
		return
	}
	h.sendToClient(client, msg)
}

func (h *Hub) sendToClient(client *Client, msg BroadcastMsg) {
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}
	select {
	case client.Send <- data:
	default:
	}
}

func (h *Hub) dispatch(msg BroadcastMsg) {
	if msg.TargetID > 0 {
		h.sendToUser(msg.TargetID, msg)
		return
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	data, _ := json.Marshal(msg)
	for _, client := range h.clients {
		select {
		case client.Send <- data:
		default:
		}
	}
}

func (h *Hub) HandleWebSocket(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "token required"})
		return
	}

	claims, err := auth.ParseToken(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Println("websocket upgrade error:", err)
		return
	}

	client := &Client{
		UserID:   claims.UserID,
		Username: claims.Username,
		Conn:     conn,
		Hub:      h,
		Send:     make(chan []byte, 256),
	}

	h.register <- client

	go client.writePump()
	go client.readPump()
}

func (c *Client) readPump() {
	defer func() {
		c.Hub.unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(4096)
	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			break
		}

		var msg WSMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			continue
		}

		c.handleMessage(msg)
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) handleMessage(msg WSMessage) {
	switch msg.Type {
	case "chat":
		c.handleChat(msg)
	case "typing":
		c.handleTyping(msg)
	case "mark_read":
		c.handleMarkRead(msg)
	case "game_invite":
		c.handleGameInvite(msg)
	case "accept_game_invite":
		c.Hub.acceptGameInvite(c.UserID, msg.InviteID)
	case "decline_game_invite":
		c.Hub.declineGameInvite(c.UserID, msg.InviteID)
	case "game_input":
		c.handleGameInput(msg)
	case "find_match":
		c.Hub.findMatch(c.UserID, false)
	case "find_ai_match":
		c.Hub.findMatch(c.UserID, true)
	case "rematch":
		c.Hub.handleRematch(c.UserID, msg.GameID)
	case "leave_game":
		c.Hub.leaveGame(c.UserID, msg.GameID)
	case "cancel_queue":
		c.Hub.removeFromQueue(c.UserID)
	}
}

func (c *Client) resolveTargetID(msg WSMessage) (int, bool) {
	if msg.TargetID > 0 {
		return msg.TargetID, true
	}
	if msg.TargetUser != "" {
		var targetID int
		if err := c.Hub.db.QueryRow(`SELECT id FROM users WHERE username = $1`, msg.TargetUser).Scan(&targetID); err == nil {
			return targetID, true
		}
	}
	return 0, false
}

func (c *Client) handleTyping(msg WSMessage) {
	targetID, ok := c.resolveTargetID(msg)
	if !ok {
		return
	}
	c.Hub.sendToUser(targetID, BroadcastMsg{
		Type:     "typing",
		UserID:   c.UserID,
		Username: c.Username,
		TargetID: targetID,
	})
}

func (c *Client) handleMarkRead(msg WSMessage) {
	targetID, ok := c.resolveTargetID(msg)
	if !ok {
		return
	}
	_, err := c.Hub.db.Exec(`UPDATE messages SET read_at = NOW() WHERE sender_id = $1 AND receiver_id = $2 AND read_at IS NULL`, targetID, c.UserID)
	if err != nil {
		return
	}
	c.Hub.sendToUser(targetID, BroadcastMsg{
		Type:     "read_receipt",
		UserID:   c.UserID,
		TargetID: targetID,
	})
}

func (c *Client) handleGameInvite(msg WSMessage) {
	targetID, ok := c.resolveTargetID(msg)
	if !ok || targetID == c.UserID {
		return
	}
	if handlers.IsBlocked(c.Hub.db, c.UserID, targetID) {
		return
	}

	inviteID := generateGameID()
	c.Hub.mu.Lock()
	c.Hub.invites[inviteID] = &GameInvite{
		ID:        inviteID,
		FromID:    c.UserID,
		FromUser:  c.Username,
		ToID:      targetID,
		CreatedAt: time.Now(),
	}
	c.Hub.mu.Unlock()

	c.Hub.sendToUser(targetID, BroadcastMsg{
		Type:     "game_invite",
		UserID:   c.UserID,
		Username: c.Username,
		TargetID: targetID,
		Data:     map[string]interface{}{"invite_id": inviteID},
	})
}

func (h *Hub) acceptGameInvite(userID int, inviteID string) {
	h.mu.Lock()
	invite, ok := h.invites[inviteID]
	if !ok || invite.ToID != userID {
		h.mu.Unlock()
		return
	}
	delete(h.invites, inviteID)
	h.removeFromQueueLocked(invite.FromID)
	h.removeFromQueueLocked(userID)

	gameID := generateGameID()
	g := game.NewPongGame(gameID, invite.FromID, userID, false)
	g.OnFinish = func(pg *game.PongGame) { h.onGameFinish(pg) }
	h.games[gameID] = g
	g.Start()

	h.sendToUserLocked(invite.FromID, BroadcastMsg{
		Type: "game_start",
		Data: map[string]interface{}{
			"game_id":  gameID,
			"side":     1,
			"is_ai":    false,
			"opponent": h.getUsername(userID),
		},
	})
	h.sendToUserLocked(userID, BroadcastMsg{
		Type: "game_start",
		Data: map[string]interface{}{
			"game_id":  gameID,
			"side":     2,
			"is_ai":    false,
			"opponent": invite.FromUser,
		},
	})
	h.mu.Unlock()
	go h.broadcastGameState(gameID)
}

func (h *Hub) declineGameInvite(userID int, inviteID string) {
	h.mu.Lock()
	invite, ok := h.invites[inviteID]
	if !ok || invite.ToID != userID {
		h.mu.Unlock()
		return
	}
	delete(h.invites, inviteID)
	h.mu.Unlock()

	h.sendToUser(invite.FromID, BroadcastMsg{
		Type: "game_invite_declined",
		Data: map[string]interface{}{"invite_id": inviteID},
	})
}

func (c *Client) handleChat(msg WSMessage) {
	if msg.Content == "" || len(msg.Content) > 2000 {
		return
	}

	var receiverID int
	if msg.TargetID > 0 {
		receiverID = msg.TargetID
	} else if msg.TargetUser != "" {
		err := c.Hub.db.QueryRow(`SELECT id FROM users WHERE username = $1`, msg.TargetUser).Scan(&receiverID)
		if err != nil {
			return
		}
	} else {
		return
	}

	if handlers.IsBlocked(c.Hub.db, c.UserID, receiverID) {
		return
	}

	var msgID int
	var createdAt time.Time
	err := c.Hub.db.QueryRow(
		`INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING id, created_at`,
		c.UserID, receiverID, msg.Content,
	).Scan(&msgID, &createdAt)
	if err != nil {
		return
	}

	chatMsg := BroadcastMsg{
		Type:     "chat",
		UserID:   c.UserID,
		Username: c.Username,
		Content:  msg.Content,
		Data: map[string]interface{}{
			"id":         msgID,
			"created_at": createdAt,
		},
		TargetID: receiverID,
	}
	c.Hub.sendToUser(receiverID, chatMsg)

	// Echo back to sender
	echo := chatMsg
	echo.Data = map[string]interface{}{
		"id":         msgID,
		"created_at": createdAt,
		"is_mine":    true,
	}
	c.Hub.sendToUser(c.UserID, echo)
}

func (c *Client) handleGameInput(msg WSMessage) {
	c.Hub.mu.RLock()
	for _, g := range c.Hub.games {
		if g.Player1ID == c.UserID || g.Player2ID == c.UserID {
			g.SetInput(c.UserID, msg.Direction)
			break
		}
	}
	c.Hub.mu.RUnlock()
}

func (h *Hub) findMatch(userID int, vsAI bool) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if vsAI {
		gameID := generateGameID()
		g := game.NewPongGame(gameID, userID, 0, true)
		g.OnFinish = func(pg *game.PongGame) { h.onGameFinish(pg) }
		h.games[gameID] = g
		g.Start()
		h.sendToUserLocked(userID, BroadcastMsg{
			Type: "game_start",
			Data: map[string]interface{}{
				"game_id": gameID,
				"side":    1,
				"is_ai":   true,
				"opponent": "AI",
			},
		})
		go h.broadcastGameState(gameID)
		return
	}

	// Check if already in queue
	for _, id := range h.matchQueue {
		if id == userID {
			return
		}
	}

	// Try to match with someone in queue
	if len(h.matchQueue) > 0 {
		opponentID := h.matchQueue[0]
		h.matchQueue = h.matchQueue[1:]

		if opponentID == userID {
			return
		}

		gameID := generateGameID()
		g := game.NewPongGame(gameID, opponentID, userID, false)
		g.OnFinish = func(pg *game.PongGame) { h.onGameFinish(pg) }
		h.games[gameID] = g
		g.Start()

		h.sendToUserLocked(opponentID, BroadcastMsg{
			Type: "game_start",
			Data: map[string]interface{}{
				"game_id":  gameID,
				"side":     1,
				"is_ai":    false,
				"opponent": h.getUsername(userID),
			},
		})
		h.sendToUserLocked(userID, BroadcastMsg{
			Type: "game_start",
			Data: map[string]interface{}{
				"game_id":  gameID,
				"side":     2,
				"is_ai":    false,
				"opponent": h.getUsername(opponentID),
			},
		})
		go h.broadcastGameState(gameID)
		return
	}

	h.matchQueue = append(h.matchQueue, userID)
	h.sendToUserLocked(userID, BroadcastMsg{Type: "queue_waiting"})
}

func (h *Hub) removeFromQueue(userID int) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for i, id := range h.matchQueue {
		if id == userID {
			h.matchQueue = append(h.matchQueue[:i], h.matchQueue[i+1:]...)
			break
		}
	}
}

func (h *Hub) broadcastGameState(gameID string) {
	ticker := time.NewTicker(time.Second / 30)
	defer ticker.Stop()

	for range ticker.C {
		h.mu.RLock()
		g, ok := h.games[gameID]
		h.mu.RUnlock()
		if !ok || !g.Running {
			return
		}

		state := g.GetState()
		msg := BroadcastMsg{Type: "game_state", Data: state}

		h.sendToUser(g.Player1ID, msg)
		if g.Player2ID > 0 {
			h.sendToUser(g.Player2ID, msg)
		}
	}
}

func (h *Hub) replayCurrentGameState(client *Client) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	for _, g := range h.games {
		if g.Player1ID != client.UserID && g.Player2ID != client.UserID {
			continue
		}
		if g.State.Status == "finished" {
			// Nothing to resume; the player still has the option to rematch
			// from the last game_over message they already received.
			continue
		}
		side := 1
		if g.Player2ID == client.UserID {
			side = 2
		}
		h.sendToClient(client, BroadcastMsg{
			Type: "game_start",
			Data: map[string]interface{}{
				"game_id":  g.ID,
				"side":     side,
				"is_ai":    g.IsAI,
				"opponent": h.getUsername(g.Player2ID),
			},
		})
		h.sendToClient(client, BroadcastMsg{Type: "game_state", Data: g.GetState()})
		return
	}
}

func (h *Hub) onGameFinish(g *game.PongGame) {
	var winnerID *int
	score1 := g.State.Score1
	score2 := g.State.Score2

	if g.State.Winner == 1 {
		id := g.Player1ID
		winnerID = &id
	} else if g.State.Winner == 2 && !g.IsAI {
		id := g.Player2ID
		winnerID = &id
	} else if g.State.Winner == 2 && g.IsAI {
		// AI won - player1 loses.
		// yyaniv double ai loss bug: this used to also run
		//   h.db.Exec(`UPDATE users SET losses = losses + 1 WHERE id = $1`, g.Player1ID)
		// right here. handlers.SaveMatch below already increments losses for
		// player1 when winnerID is nil and player2ID is nil (AI match), so doing
		// it here too caused every AI-loss to count as 2 losses instead of 1
		// Do NOT re-add a losses increment in this branch — SaveMatch owns it
		score1 = g.State.Score1
		score2 = g.State.Score2
	}

	var player2ID *int
	if !g.IsAI {
		player2ID = &g.Player2ID
	}

	_ = handlers.SaveMatch(h.db, g.Player1ID, player2ID, score1, score2, winnerID, g.IsAI)

	finishMsg := BroadcastMsg{
		Type: "game_over",
		Data: map[string]interface{}{
			"game_id": g.ID,
			"winner":  g.State.Winner,
			"score1":  score1,
			"score2":  score2,
		},
	}
	h.sendToUser(g.Player1ID, finishMsg)
	if g.Player2ID > 0 {
		h.sendToUser(g.Player2ID, finishMsg)
	}

	// Keep the finished game around briefly so a Rematch request can still find
	// it; expire it automatically if neither player rematches or leaves
	gameID := g.ID
	time.AfterFunc(2*time.Minute, func() {
		h.mu.Lock()
		defer h.mu.Unlock()
		if stale, ok := h.games[gameID]; ok && stale == g {
			delete(h.games, gameID)
		}
	})
}


func (h *Hub) handleRematch(userID int, gameID string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	g, ok := h.games[gameID]
	if !ok {
		return
	}

	if g.Player1ID != userID && g.Player2ID != userID {
		return
	}

	g.Rematch()
	go h.broadcastGameState(gameID)
}

func (h *Hub) leaveGame(userID int, gameID string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	g, ok := h.games[gameID]
	if !ok {
		return
	}
	if g.Player1ID != userID && g.Player2ID != userID {
		return
	}
	// Only clean up games that have already finished; an in-progress match
	// should keep running for the remaining player.
	if g.State.Status == "finished" {
		delete(h.games, gameID)
	}
}

const reconnectGraceSeconds = 20

func (h *Hub) handleDisconnect(userID int) {
	h.mu.Lock()
	h.removeFromQueueLocked(userID)

	for id, g := range h.games {
		if g.Player1ID != userID && g.Player2ID != userID {
			continue
		}

		if g.State.Status == "finished" {
			// Match already ended; nothing to reconnect to.
			continue
		}

		if g.IsAI {
			// No remote opponent to reconnect with, so end the match immediately.
			g.Stop()
			delete(h.games, id)
			h.mu.Unlock()
			return
		}

		opponentID := g.Player2ID
		if userID == g.Player2ID {
			opponentID = g.Player1ID
		}

		g.Pause()
		gameID := id
		h.sendToUserLocked(opponentID, BroadcastMsg{
			Type: "opponent_reconnecting",
			Data: map[string]interface{}{"game_id": gameID, "grace_seconds": reconnectGraceSeconds},
		})
		h.mu.Unlock()

		time.AfterFunc(reconnectGraceSeconds*time.Second, func() {
			h.finalizeDisconnectIfStillGone(gameID, userID, opponentID)
		})
		return
	}
	h.mu.Unlock()
}

// finalizeDisconnectIfStillGone ends the match if the disconnected player never
// rejoined within the reconnection grace period.
func (h *Hub) finalizeDisconnectIfStillGone(gameID string, userID, opponentID int) {
	h.mu.Lock()
	defer h.mu.Unlock()

	g, ok := h.games[gameID]
	if !ok {
		return
	}
	if _, stillOnline := h.clients[userID]; stillOnline {
		return
	}

	g.Stop()
	delete(h.games, gameID)
	h.sendToUserLocked(opponentID, BroadcastMsg{
		Type: "opponent_disconnected",
		Data: map[string]interface{}{"game_id": gameID},
	})
}

func (h *Hub) resumeGameIfPaused(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	for id, g := range h.games {
		if g.Player1ID != client.UserID && g.Player2ID != client.UserID {
			continue
		}
		if !g.IsPaused() {
			continue
		}
		g.Resume()
		opponentID := g.Player1ID
		if client.UserID == g.Player1ID {
			opponentID = g.Player2ID
		}
		h.sendToUserLocked(opponentID, BroadcastMsg{
			Type: "opponent_reconnected",
			Data: map[string]interface{}{"game_id": id},
		})
	}
}


func (h *Hub) removeFromQueueLocked(userID int) {
	for i, id := range h.matchQueue {
		if id == userID {
			h.matchQueue = append(h.matchQueue[:i], h.matchQueue[i+1:]...)
			break
		}
	}
}

func (h *Hub) getUsername(userID int) string {
	var username string
	_ = h.db.QueryRow(`SELECT username FROM users WHERE id = $1`, userID).Scan(&username)
	return username
}

func generateGameID() string {
	return time.Now().Format("20060102150405") + "-" + randomString(6)
}

func randomString(n int) string {
	const letters = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = letters[time.Now().UnixNano()%int64(len(letters))]
		time.Sleep(time.Nanosecond)
	}
	return string(b)
}
