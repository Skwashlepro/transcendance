CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(50)  NOT NULL UNIQUE,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    avatar_url  VARCHAR(512) DEFAULT '/avatars/default.png',
    bio         TEXT         DEFAULT '',
    wins        INTEGER      DEFAULT 0,
    losses      INTEGER      DEFAULT 0,
    xp          INTEGER      DEFAULT 0,
    level       INTEGER      DEFAULT 1,
    created_at  TIMESTAMPTZ  DEFAULT NOW(),
    last_seen   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_achievements (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_key VARCHAR(40) NOT NULL,
    unlocked_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_key)
);

CREATE TABLE IF NOT EXISTS friendships (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, friend_id),
    CHECK (user_id != friend_id)
);

CREATE TABLE IF NOT EXISTS messages (
    id          SERIAL PRIMARY KEY,
    sender_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    CHECK (char_length(content) <= 2000)
);

CREATE TABLE IF NOT EXISTS matches (
    id              SERIAL PRIMARY KEY,
    player1_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    player2_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    player1_score   INTEGER NOT NULL DEFAULT 0,
    player2_score   INTEGER NOT NULL DEFAULT 0,
    winner_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_ai           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS games (
    id              SERIAL PRIMARY KEY,
    title           VARCHAR(120) NOT NULL UNIQUE,
    genre           VARCHAR(80) NOT NULL,
    cover_image     VARCHAR(512) NOT NULL,
    developer       VARCHAR(120) NOT NULL,
    release_date    DATE NOT NULL,
    platforms       TEXT[] NOT NULL DEFAULT '{}',
    description     TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_reviews (
    id              SERIAL PRIMARY KEY,
    game_id         INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    author          VARCHAR(50) NOT NULL,
    rating          INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title           VARCHAR(160) NOT NULL,
    content         TEXT NOT NULL,
    review_date     DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_matches_players ON matches(player1_id, player2_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_games_genre ON games(genre);
CREATE INDEX IF NOT EXISTS idx_games_title ON games(title);
CREATE INDEX IF NOT EXISTS idx_game_reviews_game ON game_reviews(game_id);

INSERT INTO games (id, title, genre, cover_image, developer, release_date, platforms, description)
VALUES
    (1, 'Elden Ring', 'Action RPG', 'https://via.placeholder.com/400x225?text=Elden+Ring', 'FromSoftware', '2022-02-25', ARRAY['PC', 'PlayStation 5', 'Xbox Series X'], 'An epic action RPG where players explore the Lands Between and uncover the mysteries of the Erdtree.'),
    (2, 'Baldur''s Gate 3', 'RPG', 'https://via.placeholder.com/400x225?text=BG3', 'Larian Studios', '2023-08-03', ARRAY['PC', 'PlayStation 5', 'Xbox Series X'], 'A story-driven RPG with meaningful choices, deep party interactions, and rich tactical combat.'),
    (3, 'Tekken 8', 'Fighting', 'https://via.placeholder.com/400x225?text=Tekken+8', 'Bandai Namco', '2024-01-26', ARRAY['PC', 'PlayStation 5', 'Xbox Series X'], 'A modern fighting game with polished mechanics, dramatic story mode, and a strong competitive scene.'),
    (4, 'Hades II', 'Action', 'https://via.placeholder.com/400x225?text=Hades+II', 'Supergiant Games', '2025-05-06', ARRAY['PC', 'Xbox Series X'], 'A fast-paced action roguelike with stylish combat, a rich mythic setting, and relentless replayability.')
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    genre = EXCLUDED.genre,
    cover_image = EXCLUDED.cover_image,
    developer = EXCLUDED.developer,
    release_date = EXCLUDED.release_date,
    platforms = EXCLUDED.platforms,
    description = EXCLUDED.description,
    updated_at = NOW();

INSERT INTO game_reviews (id, game_id, author, rating, title, content, review_date)
VALUES
    (1, 1, 'gamer123', 5, 'Masterpiece!', 'The world design is breathtaking and the combat feels rewarding.', '2024-06-10'),
    (2, 1, 'reviewer456', 4, 'Great game', 'Challenging but deeply satisfying once you learn the systems.', '2024-06-08'),
    (3, 2, 'storylover', 5, 'Immersive', 'The writing and player agency are incredible.', '2024-08-15'),
    (4, 2, 'tactician', 5, 'Worth the hype', 'Every playthrough feels fresh because your decisions matter.', '2024-08-12'),
    (5, 3, 'fightfan', 4, 'Fast and fun', 'The combat feels responsive and the roster is excellent.', '2024-02-06'),
    (6, 3, 'comboqueen', 5, 'Excellent online play', 'The netcode and match flow are great for online play.', '2024-02-04'),
    (7, 4, 'roguelikefan', 5, 'Addictive', 'The progression loop is great and each run feels distinct.', '2025-05-10')
ON CONFLICT (id) DO UPDATE SET
    game_id = EXCLUDED.game_id,
    author = EXCLUDED.author,
    rating = EXCLUDED.rating,
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    review_date = EXCLUDED.review_date;
