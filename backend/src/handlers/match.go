package handlers

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
	"transcendance/backend/src/auth"
)

func GetMatchHistoryHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		username := c.Param("username")
		var userID int
		err := db.QueryRow(`SELECT id FROM users WHERE username = $1`, username).Scan(&userID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}

		rows, err := db.Query(`
			SELECT m.id, m.player1_score, m.player2_score, m.is_ai, m.created_at,
			       u1.username as player1, u2.username as player2, w.username as winner
			FROM matches m
			JOIN users u1 ON u1.id = m.player1_id
			LEFT JOIN users u2 ON u2.id = m.player2_id
			LEFT JOIN users w ON w.id = m.winner_id
			WHERE m.player1_id = $1 OR m.player2_id = $1
			ORDER BY m.created_at DESC
			LIMIT 20
		`, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch match history"})
			return
		}
		defer rows.Close()

		matches := []gin.H{}
		for rows.Next() {
			var id, score1, score2 int
			var isAI bool
			var createdAt sql.NullTime
			var player1 string
			var player2, winner sql.NullString
			if err := rows.Scan(&id, &score1, &score2, &isAI, &createdAt, &player1, &player2, &winner); err != nil {
				continue
			}
			match := gin.H{
				"id":             id,
				"player1":        player1,
				"player1_score":  score1,
				"player2_score":  score2,
				"is_ai":          isAI,
				"created_at":     createdAt.Time,
			}
			if player2.Valid {
				match["player2"] = player2.String
			} else {
				match["player2"] = "AI"
			}
			if winner.Valid {
				match["winner"] = winner.String
			}
			matches = append(matches, match)
		}

		c.JSON(http.StatusOK, gin.H{"matches": matches})
	}
}

func SaveMatch(db *sql.DB, player1ID int, player2ID *int, score1, score2 int, winnerID *int, isAI bool) error {
	_, err := db.Exec(
		`INSERT INTO matches (player1_id, player2_id, player1_score, player2_score, winner_id, is_ai)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		player1ID, player2ID, score1, score2, winnerID, isAI,
	)
	if err != nil {
		return err
	}

	if winnerID != nil {
		_, _ = db.Exec(`UPDATE users SET wins = wins + 1 WHERE id = $1`, *winnerID)
		loserID := player1ID
		if player2ID != nil && *player2ID != *winnerID {
			loserID = *player2ID
		} else if player2ID == nil && player1ID == *winnerID {
			if err := syncUserProgress(db, player1ID); err != nil {
				return err
			}
			return nil
		}
		if loserID != *winnerID {
			_, _ = db.Exec(`UPDATE users SET losses = losses + 1 WHERE id = $1`, loserID)
		}
		if err := syncUserProgress(db, *winnerID); err != nil {
			return err
		}
		if loserID != *winnerID {
			if err := syncUserProgress(db, loserID); err != nil {
				return err
			}
		}
		return nil
	}

	if player2ID == nil {
		_, _ = db.Exec(`UPDATE users SET losses = losses + 1 WHERE id = $1`, player1ID)
		return syncUserProgress(db, player1ID)
	}

	_, _ = db.Exec(`UPDATE users SET losses = losses + 1 WHERE id = $1`, player1ID)
	_, _ = db.Exec(`UPDATE users SET wins = wins + 1 WHERE id = $1`, *player2ID)
	if err := syncUserProgress(db, player1ID); err != nil {
		return err
	}
	return syncUserProgress(db, *player2ID)
}

func syncUserProgress(db *sql.DB, userID int) error {
	var wins, losses int
	if err := db.QueryRow(`SELECT wins, losses FROM users WHERE id = $1`, userID).Scan(&wins, &losses); err != nil {
		return err
	}

	totalMatches := wins + losses
	xp := wins*150 + totalMatches*20
	level := 1 + xp/250
	if _, err := db.Exec(`UPDATE users SET xp = $1, level = $2 WHERE id = $3`, xp, level, userID); err != nil {
		return err
	}

	achievements := []struct {
		key string
		ok  bool
	}{
		{key: "first_match", ok: totalMatches >= 1},
		{key: "first_win", ok: wins >= 1},
		{key: "duelist", ok: wins >= 3},
		{key: "champion", ok: wins >= 10},
		{key: "grinder", ok: totalMatches >= 20},
	}
	for _, item := range achievements {
		if item.ok {
			if _, err := db.Exec(`INSERT INTO user_achievements (user_id, achievement_key) VALUES ($1, $2) ON CONFLICT DO NOTHING`, userID, item.key); err != nil {
				return err
			}
		}
	}
	return nil
}

func HealthHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := db.Ping(); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "unhealthy", "database": "down"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "healthy", "message": "Transcendance API is running"})
	}
}

func GetMyStatsHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := auth.GetUserID(c)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
			return
		}

		var wins, losses int
		err := db.QueryRow(`SELECT wins, losses FROM users WHERE id = $1`, userID).Scan(&wins, &losses)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch stats"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"wins": wins, "losses": losses})
	}
}
