import React, { useState } from 'react';
import GameCard from '../ui/GameCard';
import './BrowseGames.css';

function BrowseGames() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');

  // Mock data - replace with API calls
  const mockGames = [
    {
      id: 1,
      title: 'Elden Ring',
      genre: 'Action RPG',
      coverImage: 'https://via.placeholder.com/400x225?text=Elden+Ring',
      reviews: [{ rating: 5 }, { rating: 4 }, { rating: 5 }],
    },
    {
      id: 2,
      title: 'Baldur\'s Gate 3',
      genre: 'RPG',
      coverImage: 'https://via.placeholder.com/400x225?text=BG3',
      reviews: [{ rating: 5 }, { rating: 5 }],
    },
    {
      id: 3,
      title: 'Tekken 8',
      genre: 'Fighting',
      coverImage: 'https://via.placeholder.com/400x225?text=Tekken+8',
      reviews: [{ rating: 4 }, { rating: 5 }, { rating: 4 }],
    },
  ];

  const genres = ['All', 'Action', 'RPG', 'Fighting', 'Strategy', 'Sports'];

  const filteredGames = mockGames.filter((game) => {
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = selectedGenre === 'All' || game.genre.includes(selectedGenre);
    return matchesSearch && matchesGenre;
  });

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

      <div className="games-grid">
        {filteredGames.length > 0 ? (
          filteredGames.map((game) => (
            <GameCard key={game.id} game={game} />
          ))
        ) : (
          <p className="no-results">No games found. Try a different search.</p>
        )}
      </div>
    </div>
  );
}

export default BrowseGames;
