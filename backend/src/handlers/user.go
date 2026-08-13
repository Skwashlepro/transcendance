package handlers

import (
	"database/sql"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"transcendance/backend/src/auth"
)

var achievementCatalog = map[string]struct {
	Title       string
	Description string
}{
	"first_match": {Title: "First Match", Description: "Play your first Pong match."},
	"first_win":   {Title: "First Victory", Description: "Win your first Pong match."},
	"duelist":     {Title: "Duelist", Description: "Win 3 matches."},
	"champion":    {Title: "Champion", Description: "Win 10 matches."},
	"grinder":     {Title: "Pong Grinder", Description: "Play 20 matches."},
}

type UpdateProfileRequest struct {
	Bio string `json:"bio"`
}

func getUserAchievements(db *sql.DB, userID int) ([]gin.H, error) {
	rows, err := db.Query(
		`SELECT achievement_key, unlocked_at FROM user_achievements WHERE user_id = $1 ORDER BY unlocked_at ASC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := []gin.H{}
	for rows.Next() {
		var key string
		var unlockedAt sql.NullTime
		if err := rows.Scan(&key, &unlockedAt); err != nil {
			continue
		}
		item, ok := achievementCatalog[key]
		if !ok {
			continue
		}
		result = append(result, gin.H{
			"key":         key,
			"title":       item.Title,
			"description": item.Description,
			"unlocked_at": unlockedAt.Time,
		})
	}
	return result, nil
}

func GetProfileHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		username := c.Param("username")
		var id int
		var email, avatarURL, bio string
		var wins, losses, xp, level int
		var lastSeen time.Time

		err := db.QueryRow(
			`SELECT id, email, avatar_url, bio, wins, losses, xp, level, last_seen FROM users WHERE username = $1`,
			username,
		).Scan(&id, &email, &avatarURL, &bio, &wins, &losses, &xp, &level, &lastSeen)

		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch profile"})
			return
		}

		achievements, err := getUserAchievements(db, id)
		if err != nil {
			achievements = []gin.H{}
		}

		progressToNext := 250 - (xp % 250)
		c.JSON(http.StatusOK, gin.H{
			"id":                id,
			"username":          username,
			"email":             email,
			"avatar_url":        avatarURL,
			"bio":               bio,
			"wins":              wins,
			"losses":            losses,
			"xp":                xp,
			"level":             level,
			"progress_to_next":  progressToNext,
			"last_seen":         lastSeen,
			"achievements":      achievements,
		})
	}
}

func GetLeaderboardHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		rows, err := db.Query(`
			SELECT username, wins, losses, xp, level
			FROM users
			WHERE wins > 0 OR losses > 0
			ORDER BY wins DESC, xp DESC, level DESC, username ASC
			LIMIT 10
		`, )
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch leaderboard"})
			return
		}
		defer rows.Close()

		leaders := []gin.H{}
		for rows.Next() {
			var username string
			var wins, losses, xp, level int
			if err := rows.Scan(&username, &wins, &losses, &xp, &level); err != nil {
				continue
			}
			leaders = append(leaders, gin.H{
				"username": username,
				"wins":     wins,
				"losses":   losses,
				"xp":       xp,
				"level":    level,
			})
		}
		c.JSON(http.StatusOK, gin.H{"leaderboard": leaders})
	}
}

func UpdateProfileHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := auth.GetUserID(c)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
			return
		}

		var req UpdateProfileRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
			return
		}

		if !auth.ValidateBio(req.Bio) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "bio must be 500 characters or less"})
			return
		}

		_, err := db.Exec(`UPDATE users SET bio = $1 WHERE id = $2`, req.Bio, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update profile"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "profile updated"})
	}
}

var allowedImageTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/gif":  ".gif",
	"image/webp": ".webp",
}

func UploadAvatarHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := auth.GetUserID(c)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
			return
		}

		file, header, err := c.Request.FormFile("avatar")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "no file uploaded"})
			return
		}
		defer file.Close()

		if header.Size > 2*1024*1024 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "file too large (max 2MB)"})
			return
		}

		buf := make([]byte, 512)
		n, _ := file.Read(buf)
		contentType := http.DetectContentType(buf[:n])
		ext, ok := allowedImageTypes[contentType]
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid file type (jpeg, png, gif, webp only)"})
			return
		}

		uploadDir := os.Getenv("UPLOAD_DIR")
		if uploadDir == "" {
			uploadDir = "./uploads"
		}
		avatarDir := filepath.Join(uploadDir, "avatars")
		if err := os.MkdirAll(avatarDir, 0755); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "upload failed"})
			return
		}

		filename := fmt.Sprintf("%d_%d%s", userID, time.Now().Unix(), ext)
		destPath := filepath.Join(avatarDir, filename)

		dest, err := os.Create(destPath)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "upload failed"})
			return
		}
		defer dest.Close()

		if _, err := dest.Write(buf[:n]); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "upload failed"})
			return
		}
		if _, err := io.Copy(dest, file); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "upload failed"})
			return
		}

		avatarURL := "/uploads/avatars/" + filename
		_, err = db.Exec(`UPDATE users SET avatar_url = $1 WHERE id = $2`, avatarURL, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save avatar"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"avatar_url": avatarURL})
	}
}

func SearchUsersHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		query := strings.TrimSpace(c.Query("q"))
		if len(query) < 2 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "search query must be at least 2 characters"})
			return
		}

		rows, err := db.Query(
			`SELECT id, username, avatar_url FROM users WHERE username ILIKE $1 LIMIT 20`,
			"%"+query+"%",
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "search failed"})
			return
		}
		defer rows.Close()

		users := []gin.H{}
		for rows.Next() {
			var id int
			var username, avatarURL string
			if err := rows.Scan(&id, &username, &avatarURL); err != nil {
				continue
			}
			users = append(users, gin.H{"id": id, "username": username, "avatar_url": avatarURL})
		}

		c.JSON(http.StatusOK, gin.H{"users": users})
	}
}
