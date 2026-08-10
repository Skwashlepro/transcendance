package handlers

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
)

func HealthHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		err := db.Ping()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "database connection failed"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok", "message": "server is healthy"})
	}
}
