package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"transcendance/backend/src/auth"
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
	ID              int                `json:"id"`
	Title           string             `json:"title"`
	Genre           string             `json:"genre"`
	CoverImage      string             `json:"coverImage"`
	Developer       string             `json:"developer"`
	ReleaseDate     string             `json:"releaseDate"`
	Platforms       []string           `json:"platforms"`
	Description     string             `json:"description"`
	TrailerURL      string             `json:"trailerUrl"`
	Screenshots     []string           `json:"screenshots"`
	ReviewScore     int                `json:"reviewScore"`
	ReviewScoreDesc string             `json:"reviewScoreDesc"`
	TotalReviews    int                `json:"totalReviews"`
	Reviews         []publicGameReview `json:"reviews"`
}

type createGameReviewRequest struct {
	Rating          int      `json:"rating" binding:"required"`
	Title           string   `json:"title" binding:"required"`
	Content         string   `json:"content" binding:"required"`
	GameTitle       string   `json:"gameTitle"`
	GameGenre       string   `json:"gameGenre"`
	GameCoverImage  string   `json:"gameCoverImage"`
	GameDeveloper   string   `json:"gameDeveloper"`
	GameReleaseDate string   `json:"gameReleaseDate"`
	GamePlatforms   []string `json:"gamePlatforms"`
	GameDescription string   `json:"gameDescription"`
}

func normalizeReleaseDate(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return time.Now().Format("2006-01-02")
	}

	if _, err := time.Parse("2006-01-02", raw); err == nil {
		return raw
	}

	layouts := []string{"Jan 2, 2006", "2 Jan, 2006", "Jan 2 2006", "2 Jan 2006", "January 2, 2006", "January 2 2006"}
	for _, layout := range layouts {
		if parsed, err := time.Parse(layout, raw); err == nil {
			return parsed.Format("2006-01-02")
		}
	}

	return time.Now().Format("2006-01-02")
}

func ensureGameRecord(db *sql.DB, gameID int, req createGameReviewRequest) error {
	var exists bool
	if err := db.QueryRow(`SELECT EXISTS(SELECT 1 FROM games WHERE id = $1)`, gameID).Scan(&exists); err != nil {
		return err
	}
	if exists {
		return nil
	}

	title := strings.TrimSpace(req.GameTitle)
	if title == "" {
		title = fmt.Sprintf("Game %d", gameID)
	}
	genre := strings.TrimSpace(req.GameGenre)
	if genre == "" {
		genre = "Unknown"
	}
	coverImage := strings.TrimSpace(req.GameCoverImage)
	if coverImage == "" {
		coverImage = fmt.Sprintf("https://via.placeholder.com/400x225?text=Game+%d", gameID)
	}
	developer := strings.TrimSpace(req.GameDeveloper)
	if developer == "" {
		developer = "Unknown"
	}
	platforms := req.GamePlatforms
	if len(platforms) == 0 {
		platforms = []string{"Unknown"}
	}
	description := strings.TrimSpace(req.GameDescription)
	if description == "" {
		description = "No description available yet."
	}
	releaseDate := normalizeReleaseDate(req.GameReleaseDate)

	insertStmt := `
		INSERT INTO games (id, title, genre, cover_image, developer, release_date, platforms, description)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (id) DO UPDATE SET
			title = EXCLUDED.title,
			genre = EXCLUDED.genre,
			cover_image = EXCLUDED.cover_image,
			developer = EXCLUDED.developer,
			release_date = EXCLUDED.release_date,
			platforms = EXCLUDED.platforms,
			description = EXCLUDED.description,
			updated_at = NOW()`

	if _, err := db.Exec(insertStmt, gameID, title, genre, coverImage, developer, releaseDate, pq.Array(platforms), description); err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "games_title_key") {
			title = fmt.Sprintf("%s (%d)", title, gameID)
			_, retryErr := db.Exec(insertStmt, gameID, title, genre, coverImage, developer, releaseDate, pq.Array(platforms), description)
			return retryErr
		}
		return err
	}

	return nil
}

func loadGameReviews(db *sql.DB, gameID int) ([]publicGameReview, error) {
	rows, err := db.Query(`
		SELECT id, author, rating, title, content, to_char(review_date, 'YYYY-MM-DD')
		FROM game_reviews
		WHERE game_id = $1
		ORDER BY created_at DESC, id DESC
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

func fetchSteamReviewSummary(appID int) (int, string, int, error) {
	client := &http.Client{Timeout: 5 * time.Second}
	reviewURL := fmt.Sprintf("https://store.steampowered.com/appreviews/%d?json=1&language=all&purchase_type=all&num_per_page=0", appID)
	req, err := http.NewRequest(http.MethodGet, reviewURL, nil)
	if err != nil {
		return 0, "", 0, err
	}

	resp, err := client.Do(req)
	if err != nil {
		return 0, "", 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, "", 0, fmt.Errorf("steam review summary returned %s", resp.Status)
	}

	var payload struct {
		Success      int `json:"success"`
		QuerySummary struct {
			ReviewScore     int    `json:"review_score"`
			ReviewScoreDesc string `json:"review_score_desc"`
			TotalReviews    int    `json:"total_reviews"`
		} `json:"query_summary"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return 0, "", 0, err
	}

	return payload.QuerySummary.ReviewScore, payload.QuerySummary.ReviewScoreDesc, payload.QuerySummary.TotalReviews, nil
}

func scanGames(rows *sql.Rows, db *sql.DB) ([]publicGame, error) {
	games := make([]publicGame, 0)
	for rows.Next() {
		var game publicGame
		var steamAppID int
		var platforms pq.StringArray
		if err := rows.Scan(&game.ID, &steamAppID, &game.Title, &game.Genre, &game.CoverImage, &game.Developer, &game.ReleaseDate, &platforms, &game.Description); err != nil {
			return nil, err
		}
		game.Platforms = []string(platforms)
		enrichGameWithSteam(&game)
		if score, scoreDesc, totalReviews, err := fetchSteamReviewSummary(steamAppID); err == nil {
			game.ReviewScore = score
			game.ReviewScoreDesc = scoreDesc
			game.TotalReviews = totalReviews
		}
		game.Reviews = nil
		games = append(games, game)
	}

	return games, rows.Err()
}

func fetchSteamCatalogPage(query string, page int) ([]publicGame, error) {
	client := &http.Client{Timeout: 8 * time.Second}
	searchURL := fmt.Sprintf("https://store.steampowered.com/api/storesearch/?term=%s&l=english&cc=us&page=%d&count=100", url.QueryEscape(query), page)
	req, err := http.NewRequest(http.MethodGet, searchURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("steam catalog search returned %s", resp.Status)
	}

	var searchData steamSearchResult
	if err := json.NewDecoder(resp.Body).Decode(&searchData); err != nil {
		return nil, err
	}

	games := make([]publicGame, 0, len(searchData.Items))
	seen := make(map[int]struct{})
	for _, item := range searchData.Items {
		if item.Type != "app" {
			continue
		}
		if _, ok := seen[item.ID]; ok {
			continue
		}
		seen[item.ID] = struct{}{}

		game := publicGame{
			ID:          item.ID,
			Title:       item.Name,
			Genre:       strings.TrimSpace(item.Caption),
			CoverImage:  item.TinyImage,
			Platforms:   []string{},
			Description: item.Caption,
		}
		enrichGameWithSteam(&game)
		if score, scoreDesc, totalReviews, err := fetchSteamReviewSummary(item.ID); err == nil {
			game.ReviewScore = score
			game.ReviewScoreDesc = scoreDesc
			game.TotalReviews = totalReviews
		}
		games = append(games, game)
		if len(games) >= 100 {
			break
		}
	}

	return games, nil
}

func GetGamesHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		searchQuery := strings.TrimSpace(c.Query("search"))
		genreFilter := strings.TrimSpace(c.Query("genre"))
		page := 1
		if pageParam := strings.TrimSpace(c.Query("page")); pageParam != "" {
			if parsedPage, err := strconv.Atoi(pageParam); err == nil && parsedPage > 0 {
				page = parsedPage
			}
		}

		steamGames, err := fetchSteamCatalogPage(searchQuery, page)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch games"})
			return
		}

		games := steamGames
		if genreFilter != "" && genreFilter != "All" {
			filtered := make([]publicGame, 0, len(games))
			for _, game := range games {
				if strings.Contains(strings.ToLower(game.Genre), strings.ToLower(genreFilter)) {
					filtered = append(filtered, game)
				}
			}
			games = filtered
		}

		genres := []string{"All"}
		genreSeen := make(map[string]struct{})
		for _, game := range games {
			genre := strings.TrimSpace(game.Genre)
			if genre == "" {
				continue
			}
			if _, ok := genreSeen[genre]; ok {
				continue
			}
			genreSeen[genre] = struct{}{}
			genres = append(genres, genre)
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
		enrichGameWithSteam(&game)
		if score, scoreDesc, totalReviews, err := fetchSteamReviewSummary(id); err == nil {
			game.ReviewScore = score
			game.ReviewScoreDesc = scoreDesc
			game.TotalReviews = totalReviews
		}
		reviews, reviewsErr := loadGameReviews(db, id)
		if reviewsErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch game reviews"})
			return
		}
		game.Reviews = reviews

		c.JSON(http.StatusOK, gin.H{"game": game})
	}
}

func CreateGameReviewHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, ok := auth.GetUserID(c)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
			return
		}

		idParam := c.Param("id")
		gameID, err := strconv.Atoi(idParam)
		if err != nil || gameID <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid game id"})
			return
		}

		var req createGameReviewRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid review payload"})
			return
		}

		req.Title = strings.TrimSpace(req.Title)
		req.Content = strings.TrimSpace(req.Content)
		if req.Rating < 1 || req.Rating > 5 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "rating must be between 1 and 5"})
			return
		}
		if len(req.Title) < 3 || len(req.Title) > 160 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "review title must be between 3 and 160 characters"})
			return
		}
		if len(req.Content) < 10 || len(req.Content) > 5000 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "review content must be between 10 and 5000 characters"})
			return
		}

		var username string
		if err := db.QueryRow(`SELECT username FROM users WHERE id = $1`, userID).Scan(&username); err != nil {
			if err == sql.ErrNoRows {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not validate user"})
			return
		}

		if err := ensureGameRecord(db, gameID, req); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not prepare game record"})
			return
		}

		var reviewID int
		var reviewDate string
		err = db.QueryRow(`
			INSERT INTO game_reviews (game_id, author, rating, title, content)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING id, to_char(review_date, 'YYYY-MM-DD')
		`, gameID, username, req.Rating, req.Title, req.Content).Scan(&reviewID, &reviewDate)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create review"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"message": "review created",
			"review": publicGameReview{
				ID:      reviewID,
				Author:  username,
				Rating:  req.Rating,
				Title:   req.Title,
				Content: req.Content,
				Date:    reviewDate,
			},
		})
	}
}
