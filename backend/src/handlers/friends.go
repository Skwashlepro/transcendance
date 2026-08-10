package handlers

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
	"transcendance/backend/src/auth"
)

type FriendRequest struct {
	Username string `json:"username" binding:"required"`
}

func ListFriendsHandler(db *sql.DB, onlineUsers map[int]bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := auth.GetUserID(c)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
			return
		}

		rows, err := db.Query(`
			SELECT u.id, u.username, u.avatar_url, f.status,
			       CASE WHEN f.user_id = $1 THEN f.friend_id ELSE f.user_id END as friend_user_id
			FROM friendships f
			JOIN users u ON u.id = CASE WHEN f.user_id = $1 THEN f.friend_id ELSE f.user_id END
			WHERE (f.user_id = $1 OR f.friend_id = $1) AND f.status = 'accepted'
		`, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch friends"})
			return
		}
		defer rows.Close()

		friends := []gin.H{}
		for rows.Next() {
			var id, friendUserID int
			var username, avatarURL, status string
			if err := rows.Scan(&id, &username, &avatarURL, &status, &friendUserID); err != nil {
				continue
			}
			friends = append(friends, gin.H{
				"id":         id,
				"username":   username,
				"avatar_url": avatarURL,
				"online":     onlineUsers[friendUserID],
			})
		}

		c.JSON(http.StatusOK, gin.H{"friends": friends})
	}
}

func ListPendingHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := auth.GetUserID(c)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
			return
		}

		rows, err := db.Query(`
			SELECT u.id, u.username, u.avatar_url, f.id as request_id
			FROM friendships f
			JOIN users u ON u.id = f.user_id
			WHERE f.friend_id = $1 AND f.status = 'pending'
		`, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch requests"})
			return
		}
		defer rows.Close()

		requests := []gin.H{}
		for rows.Next() {
			var id, requestID int
			var username, avatarURL string
			if err := rows.Scan(&id, &username, &avatarURL, &requestID); err != nil {
				continue
			}
			requests = append(requests, gin.H{
				"id":         id,
				"username":   username,
				"avatar_url": avatarURL,
				"request_id": requestID,
			})
		}

		c.JSON(http.StatusOK, gin.H{"requests": requests})
	}
}

func AddFriendHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := auth.GetUserID(c)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
			return
		}

		var req FriendRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "username required"})
			return
		}

		var friendID int
		err := db.QueryRow(`SELECT id FROM users WHERE username = $1`, req.Username).Scan(&friendID)
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not find user"})
			return
		}

		if friendID == userID {
			c.JSON(http.StatusBadRequest, gin.H{"error": "cannot add yourself"})
			return
		}

		_, err = db.Exec(
			`INSERT INTO friendships (user_id, friend_id, status) VALUES ($1, $2, 'pending')`,
			userID, friendID,
		)
		if err != nil {
			c.JSON(http.StatusConflict, gin.H{"error": "friend request already exists"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{"message": "friend request sent"})
	}
}

func AcceptFriendHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := auth.GetUserID(c)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
			return
		}

		requestID := c.Param("id")
		result, err := db.Exec(
			`UPDATE friendships SET status = 'accepted' WHERE id = $1 AND friend_id = $2 AND status = 'pending'`,
			requestID, userID,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not accept request"})
			return
		}

		rows, _ := result.RowsAffected()
		if rows == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "request not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "friend request accepted"})
	}
}

func RemoveFriendHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := auth.GetUserID(c)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
			return
		}

		friendUsername := c.Param("username")
		var friendID int
		err := db.QueryRow(`SELECT id FROM users WHERE username = $1`, friendUsername).Scan(&friendID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}

		_, err = db.Exec(
			`DELETE FROM friendships WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
			userID, friendID,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not remove friend"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "friend removed"})
	}
}
