package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

type steamSearchResult struct {
	Items []struct {
		ID        int    `json:"id"`
		Name      string `json:"name"`
		TinyImage string `json:"tiny_image"`
		Caption   string `json:"caption"`
		Type      string `json:"type"`
		Platforms struct {
			Windows bool `json:"windows"`
			Mac     bool `json:"mac"`
			Linux   bool `json:"linux"`
		} `json:"platforms"`
	} `json:"items"`
}

type steamAppDetails struct {
	Success bool `json:"success"`
	Data    struct {
		HeaderImage      string   `json:"header_image"`
		ShortDescription string   `json:"short_description"`
		Developers       []string `json:"developers"`
		ReleaseDate      struct {
			ComingSoon bool   `json:"coming_soon"`
			Date       string `json:"date"`
		} `json:"release_date"`
		Genres []struct {
			Description string `json:"description"`
		} `json:"genres"`
		Platforms struct {
			Windows bool `json:"windows"`
			Mac     bool `json:"mac"`
			Linux   bool `json:"linux"`
		} `json:"platforms"`
		Movies []struct {
			MP4 struct {
				Max string `json:"max"`
			} `json:"mp4"`
			WebM struct {
				Max string `json:"max"`
			} `json:"webm"`
			Thumbnail string `json:"thumbnail"`
		} `json:"movies"`
		Screenshots []struct {
			PathFull      string `json:"path_full"`
			PathThumbnail string `json:"path_thumbnail"`
		} `json:"screenshots"`
	} `json:"data"`
}

type steamEnrichment struct {
	CoverImage  string
	Developer   string
	ReleaseDate string
	Genre       string
	Description string
	Platforms   []string
	TrailerURL  string
	Screenshots []string
}

var steamEnrichmentCache = struct {
	sync.Mutex
	items map[string]cachedSteamEnrichment
}{items: make(map[string]cachedSteamEnrichment)}

type cachedSteamEnrichment struct {
	value     steamEnrichment
	fetchedAt time.Time
}

const steamEnrichmentTTL = 6 * time.Hour

func fetchSteamEnrichment(gameTitle string) (*steamEnrichment, error) {
	cacheKey := strings.ToLower(strings.TrimSpace(gameTitle))
	steamEnrichmentCache.Lock()
	if cached, ok := steamEnrichmentCache.items[cacheKey]; ok && time.Since(cached.fetchedAt) < steamEnrichmentTTL {
		value := cached.value
		steamEnrichmentCache.Unlock()
		return &value, nil
	}
	steamEnrichmentCache.Unlock()

	searchURL := fmt.Sprintf("https://store.steampowered.com/api/storesearch/?term=%s&l=english&cc=us", url.QueryEscape(gameTitle))
	client := &http.Client{Timeout: 5 * time.Second}
	searchReq, err := http.NewRequest(http.MethodGet, searchURL, nil)
	if err != nil {
		return nil, err
	}

	searchResp, err := client.Do(searchReq)
	if err != nil {
		return nil, err
	}
	defer searchResp.Body.Close()

	if searchResp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("steam search returned %s", searchResp.Status)
	}

	var searchData steamSearchResult
	if err := json.NewDecoder(searchResp.Body).Decode(&searchData); err != nil {
		return nil, err
	}

	if len(searchData.Items) == 0 {
		return nil, fmt.Errorf("no steam match for %s", gameTitle)
	}

	selected := searchData.Items[0]
	for _, item := range searchData.Items {
		if strings.EqualFold(strings.TrimSpace(item.Name), strings.TrimSpace(gameTitle)) {
			selected = item
			break
		}
	}

	appDetailsURL := fmt.Sprintf("https://store.steampowered.com/api/appdetails?appids=%d&l=english&cc=us", selected.ID)
	detailsReq, err := http.NewRequest(http.MethodGet, appDetailsURL, nil)
	if err != nil {
		return nil, err
	}

	detailsResp, err := client.Do(detailsReq)
	if err != nil {
		return nil, err
	}
	defer detailsResp.Body.Close()

	if detailsResp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("steam appdetails returned %s", detailsResp.Status)
	}

	var detailsEnvelope map[string]steamAppDetails
	if err := json.NewDecoder(detailsResp.Body).Decode(&detailsEnvelope); err != nil {
		return nil, err
	}

	details, ok := detailsEnvelope[fmt.Sprintf("%d", selected.ID)]
	if !ok || !details.Success {
		return nil, fmt.Errorf("steam appdetails missing data for %d", selected.ID)
	}

	enrichment := steamEnrichment{
		CoverImage:  details.Data.HeaderImage,
		Description: details.Data.ShortDescription,
	}

	if len(details.Data.Developers) > 0 {
		enrichment.Developer = details.Data.Developers[0]
	}
	if !details.Data.ReleaseDate.ComingSoon && details.Data.ReleaseDate.Date != "" {
		enrichment.ReleaseDate = details.Data.ReleaseDate.Date
	}
	if len(details.Data.Genres) > 0 {
		enrichment.Genre = details.Data.Genres[0].Description
	}
	if len(details.Data.Movies) > 0 {
		if details.Data.Movies[0].MP4.Max != "" {
			enrichment.TrailerURL = details.Data.Movies[0].MP4.Max
		} else if details.Data.Movies[0].WebM.Max != "" {
			enrichment.TrailerURL = details.Data.Movies[0].WebM.Max
		}
	}
	for _, screenshot := range details.Data.Screenshots {
		if screenshot.PathFull != "" {
			enrichment.Screenshots = append(enrichment.Screenshots, screenshot.PathFull)
		}
	}

	platforms := make([]string, 0, 3)
	if details.Data.Platforms.Windows {
		platforms = append(platforms, "Windows")
	}
	if details.Data.Platforms.Mac {
		platforms = append(platforms, "macOS")
	}
	if details.Data.Platforms.Linux {
		platforms = append(platforms, "Linux")
	}
	enrichment.Platforms = platforms

	steamEnrichmentCache.Lock()
	steamEnrichmentCache.items[cacheKey] = cachedSteamEnrichment{value: enrichment, fetchedAt: time.Now()}
	steamEnrichmentCache.Unlock()

	return &enrichment, nil
}

func enrichGameWithSteam(game *publicGame) {
	enrichment, err := fetchSteamEnrichment(game.Title)
	if err != nil || enrichment == nil {
		return
	}

	if enrichment.CoverImage != "" {
		game.CoverImage = enrichment.CoverImage
	}
	if enrichment.Developer != "" {
		game.Developer = enrichment.Developer
	}
	if enrichment.ReleaseDate != "" {
		game.ReleaseDate = enrichment.ReleaseDate
	}
	if enrichment.Genre != "" {
		game.Genre = enrichment.Genre
	}
	if enrichment.Description != "" {
		game.Description = enrichment.Description
	}
	if len(enrichment.Platforms) > 0 {
		game.Platforms = enrichment.Platforms
	}
	if enrichment.TrailerURL != "" {
		game.TrailerURL = enrichment.TrailerURL
	}
	if len(enrichment.Screenshots) > 0 {
		game.Screenshots = enrichment.Screenshots
	}
}
