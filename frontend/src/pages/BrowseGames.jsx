import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import GameCard from '../ui/GameCard';
import './BrowseGames.css';

const CATALOG_CACHE_KEY = 'game_catalog_cache_v1';

function BrowseGames() {
  const [games, setGames] = useState([]);
  const [genres, setGenres] = useState(['All']);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    let isMounted = true;

    async function loadGames() {
      setLoading(true);
      setError('');

      const shouldUseCachedList = debouncedQuery.trim() === '' && selectedGenre === 'All';
      if (shouldUseCachedList) {
        try {
          const cached = JSON.parse(localStorage.getItem(CATALOG_CACHE_KEY) || 'null');
          if (isMounted && cached && Array.isArray(cached.games) && cached.games.length > 0) {
            setGames(cached.games);
            setGenres(cached.genres || ['All']);
            setLoading(false);
          }
        } catch {
          // Ignore broken cache entries and fall back to API.
        }
      }

      try {
        const data = await api.getGames({
          search: debouncedQuery,
          genre: selectedGenre,
        });
        if (isMounted) {
          const nextGames = data.games || [];
          const nextGenres = data.genres || ['All'];
          setGames(nextGames);
          setGenres(nextGenres);

          if (shouldUseCachedList && nextGames.length > 0) {
            localStorage.setItem(
              CATALOG_CACHE_KEY,
              JSON.stringify({
                games: nextGames,
                genres: nextGenres,
                updatedAt: Date.now(),
              }),
            );
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Unable to load games');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadGames();
    return () => {
      isMounted = false;
    };
  }, [debouncedQuery, selectedGenre]);

  return (
    <div className="browse-games">
      <h1>Browse Games</h1>

      <div className="filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search games..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="genre-filter">
          {genres.map((genre) => (
            <button
              key={genre}
              className={`genre-btn ${selectedGenre === genre ? 'active' : ''}`}
              onClick={() => setSelectedGenre(genre)}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="no-results">Loading games...</p>
      ) : error ? (
        <p className="no-results">{error}</p>
      ) : (
        <div className="games-grid">
          {games.length > 0 ? (
            games.map((game) => (
              <GameCard key={game.id} game={game} />
            ))
          ) : (
            <p className="no-results">No games found. Try a different search.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default BrowseGames;
