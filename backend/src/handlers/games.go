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
		game.Reviews = nil

		c.JSON(http.StatusOK, gin.H{"game": game})
	}
}
