package handlers

import (
	"database/sql"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
)

type publicGameReview struct {
	ID      int    `json:"id"`
	Author  string `json:"author"`
	Rating  int    `json:"rating"`
	Title   string `json:"title"`
	Content string `json:"content"`
	Date    string `json:"date"`
}

type publicGame struct {
	ID          int                `json:"id"`
	Title       string             `json:"title"`
	Genre       string             `json:"genre"`
	CoverImage  string             `json:"coverImage"`
	Developer   string             `json:"developer"`
	ReleaseDate string             `json:"releaseDate"`
	Platforms   []string           `json:"platforms"`
	Description string             `json:"description"`
	Reviews     []publicGameReview `json:"reviews"`
}

func fetchReviews(db *sql.DB, gameID int) ([]publicGameReview, error) {
	rows, err := db.Query(`
		SELECT id, author, rating, title, content, to_char(review_date, 'YYYY-MM-DD')
		FROM game_reviews
		WHERE game_id = $1
		ORDER BY review_date DESC, id DESC
	`, gameID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	reviews := make([]publicGameReview, 0)
	for rows.Next() {
		var review publicGameReview
		if err := rows.Scan(&review.ID, &review.Author, &review.Rating, &review.Title, &review.Content, &review.Date); err != nil {
			return nil, err
		}
		reviews = append(reviews, review)
	}

	return reviews, rows.Err()
}

func scanGames(rows *sql.Rows, db *sql.DB) ([]publicGame, error) {
	games := make([]publicGame, 0)
	for rows.Next() {
		var game publicGame
		var platforms pq.StringArray
		if err := rows.Scan(&game.ID, &game.Title, &game.Genre, &game.CoverImage, &game.Developer, &game.ReleaseDate, &platforms, &game.Description); err != nil {
			return nil, err
		}
		game.Platforms = []string(platforms)

		reviews, err := fetchReviews(db, game.ID)
		if err != nil {
			return nil, err
		}
		game.Reviews = reviews
		games = append(games, game)
	}

	return games, rows.Err()
}

func GetGamesHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		searchQuery := strings.ToLower(strings.TrimSpace(c.Query("search")))
		genreFilter := strings.TrimSpace(c.Query("genre"))

		rows, err := db.Query(`
			SELECT id, title, genre, cover_image, developer, to_char(release_date, 'YYYY-MM-DD'), platforms, description
			FROM games
			WHERE ($1 = '' OR title ILIKE '%' || $1 || '%' OR genre ILIKE '%' || $1 || '%' OR description ILIKE '%' || $1 || '%')
			AND ($2 = '' OR $2 = 'All' OR genre ILIKE '%' || $2 || '%')
			ORDER BY title ASC
		`, searchQuery, genreFilter)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch games"})
			return
		}
		defer rows.Close()

		games, err := scanGames(rows, db)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch games"})
			return
		}

		genreRows, err := db.Query(`SELECT DISTINCT genre FROM games ORDER BY genre ASC`)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch genres"})
			return
		}
		defer genreRows.Close()

		genres := []string{"All"}
		for genreRows.Next() {
			var genre string
			if err := genreRows.Scan(&genre); err == nil {
				genres = append(genres, genre)
			}
		}

		if err := genreRows.Err(); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch genres"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"games": games, "genres": genres})
	}
}

func GetGameHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		idParam := c.Param("id")
		id, err := strconv.Atoi(idParam)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid game id"})
			return
		}

		row := db.QueryRow(`
			SELECT id, title, genre, cover_image, developer, to_char(release_date, 'YYYY-MM-DD'), platforms, description
			FROM games
			WHERE id = $1
		`, id)

		var game publicGame
		var platforms pq.StringArray
		if err := row.Scan(&game.ID, &game.Title, &game.Genre, &game.CoverImage, &game.Developer, &game.ReleaseDate, &platforms, &game.Description); err != nil {
			if err == sql.ErrNoRows {
				c.JSON(http.StatusNotFound, gin.H{"error": "game not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch game"})
			return
		}
		game.Platforms = []string(platforms)

		reviews, err := fetchReviews(db, game.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch reviews"})
			return
		}
		game.Reviews = reviews

		c.JSON(http.StatusOK, gin.H{"game": game})
	}
}
