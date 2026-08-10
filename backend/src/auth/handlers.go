package auth

import (
	"database/sql"
	"net/http"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"transcendance/backend/src/security"
)

type SignupRequest struct {
	Username string `json:"username" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

type SigninRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

var usernameRegex = regexp.MustCompile(`^[a-zA-Z0-9_]{3,30}$`)

func SignupHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req SignupRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request: username, email and password (min 8 chars) required"})
			return
		}

		req.Username = strings.TrimSpace(req.Username)
		req.Email = strings.TrimSpace(strings.ToLower(req.Email))

		if !usernameRegex.MatchString(req.Username) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "username must be 3-30 alphanumeric characters or underscores"})
			return
		}

		hash, err := security.HashPassword(req.Password)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not hash password"})
			return
		}

		var userID int
		err = db.QueryRow(
			`INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id`,
			req.Username, req.Email, hash,
		).Scan(&userID)

		if err != nil {
			if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
				c.JSON(http.StatusConflict, gin.H{"error": "username or email already exists"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create account"})
			return
		}

		token, err := GenerateToken(userID, req.Username)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "account created but login failed"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"message":  "account created",
			"token":    token,
			"username": req.Username,
			"user_id":  userID,
		})
	}
}

func SigninHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req SigninRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "username and password required"})
			return
		}

		var userID int
		var username, hash string
		err := db.QueryRow(
			`SELECT id, username, password FROM users WHERE username = $1 OR email = $1`,
			strings.TrimSpace(req.Username),
		).Scan(&userID, &username, &hash)

		if err == sql.ErrNoRows {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "login failed"})
			return
		}

		if !security.CheckPassword(req.Password, hash) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
			return
		}

		_, _ = db.Exec(`UPDATE users SET last_seen = NOW() WHERE id = $1`, userID)

		token, err := GenerateToken(userID, username)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "login failed"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"token":    token,
			"username": username,
			"user_id":  userID,
		})
	}
}

func MeHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := GetUserID(c)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
			return
		}

		var username, email, avatarURL, bio string
		var wins, losses int
		err := db.QueryRow(
			`SELECT username, email, avatar_url, bio, wins, losses FROM users WHERE id = $1`,
			userID,
		).Scan(&username, &email, &avatarURL, &bio, &wins, &losses)

		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"id":         userID,
			"username":   username,
			"email":      email,
			"avatar_url": avatarURL,
			"bio":        bio,
			"wins":       wins,
			"losses":     losses,
		})
	}
}

func ValidateBio(bio string) bool {
	return utf8.RuneCountInString(bio) <= 500
}
