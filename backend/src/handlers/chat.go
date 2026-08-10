package handlers

import (
	"database/sql"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"transcendance/backend/src/auth"
)

type SendMessageRequest struct {
	Content string `json:"content" binding:"required"`
}

func GetChatHistoryHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := auth.GetUserID(c)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
			return
		}

		otherUsername := c.Param("username")
		var otherID int
		err := db.QueryRow(`SELECT id FROM users WHERE username = $1`, otherUsername).Scan(&otherID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}

		limit := 50
		if l := c.Query("limit"); l != "" {
			if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 200 {
				limit = parsed
			}
		}

		rows, err := db.Query(`
			SELECT m.id, m.sender_id, u.username, m.content, m.created_at
			FROM messages m
			JOIN users u ON u.id = m.sender_id
			WHERE (m.sender_id = $1 AND m.receiver_id = $2) OR (m.sender_id = $2 AND m.receiver_id = $1)
			ORDER BY m.created_at DESC
			LIMIT $3
		`, userID, otherID, limit)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch messages"})
			return
		}
		defer rows.Close()

		messages := []gin.H{}
		for rows.Next() {
			var id, senderID int
			var username, content string
			var createdAt sql.NullTime
			if err := rows.Scan(&id, &senderID, &username, &content, &createdAt); err != nil {
				continue
			}
			messages = append(messages, gin.H{
				"id":         id,
				"sender_id":  senderID,
				"username":   username,
				"content":    content,
				"created_at": createdAt.Time,
				"is_mine":    senderID == userID,
			})
		}

		// Reverse to chronological order
		for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
			messages[i], messages[j] = messages[j], messages[i]
		}

		c.JSON(http.StatusOK, gin.H{"messages": messages})
	}
}

func SendMessageHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := auth.GetUserID(c)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
			return
		}

		otherUsername := c.Param("username")
		var otherID int
		err := db.QueryRow(`SELECT id FROM users WHERE username = $1`, otherUsername).Scan(&otherID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}

		var req SendMessageRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "message content required"})
			return
		}

		if len(req.Content) == 0 || len(req.Content) > 2000 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "message must be 1-2000 characters"})
			return
		}

		var msgID int
		var createdAt sql.NullTime
		err = db.QueryRow(
			`INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING id, created_at`,
			userID, otherID, req.Content,
		).Scan(&msgID, &createdAt)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not send message"})
			return
		}

		username, _ := c.Get("username")

		c.JSON(http.StatusCreated, gin.H{
			"id":         msgID,
			"sender_id":  userID,
			"username":   username,
			"content":    req.Content,
			"created_at": createdAt.Time,
		})
	}
}

func GetConversationsHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := auth.GetUserID(c)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
			return
		}

		rows, err := db.Query(`
			SELECT DISTINCT ON (partner_id) partner_id, partner_username, partner_avatar, last_message, last_at
			FROM (
				SELECT
					CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END as partner_id,
					u.username as partner_username,
					u.avatar_url as partner_avatar,
					m.content as last_message,
					m.created_at as last_at
				FROM messages m
				JOIN users u ON u.id = CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END
				WHERE m.sender_id = $1 OR m.receiver_id = $1
				ORDER BY m.created_at DESC
			) sub
			ORDER BY partner_id, last_at DESC
		`, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch conversations"})
			return
		}
		defer rows.Close()

		conversations := []gin.H{}
		for rows.Next() {
			var partnerID int
			var username, avatarURL, lastMessage string
			var lastAt sql.NullTime
			if err := rows.Scan(&partnerID, &username, &avatarURL, &lastMessage, &lastAt); err != nil {
				continue
			}
			conversations = append(conversations, gin.H{
				"user_id":      partnerID,
				"username":     username,
				"avatar_url":   avatarURL,
				"last_message": lastMessage,
				"last_at":      lastAt.Time,
			})
		}

		c.JSON(http.StatusOK, gin.H{"conversations": conversations})
	}
}
