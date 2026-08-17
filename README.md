This project has been created as part of the 42 curriculum by lmokhtar, luctan, yyaniv, and rromanov.

## Description
This project is a full-stack Pong platform developed as part of the 42 ft_transcendence subject. The application includes a secure authentication system, real-time multiplayer features, chat, profile management, friend interactions, and a server-authoritative Pong game. The goal is to deliver a polished web application with a Dockerized deployment and PostgreSQL-backed persistence.

## Instructions
1. Copy .env.example to .env and adjust the values for your environment.
2. Start the platform with docker compose up --build from the docker directory.
3. Access the frontend at http://localhost:3000 and the backend API at http://localhost:8000.
4. Use the login and signup flow to create an account and start playing.

## Resources
- 42 ft_transcendence subject
- React documentation
- Gin framework documentation
- PostgreSQL documentation
- Gorilla WebSocket documentation

## AI usage
This project was developed without using AI-generated source code as a substitute for a real implementation. Any AI assistance was limited to planning, debugging, and validation support as part of development guidance.

## Team information

The project was initially developed by two team members, lmokhtar and luctan. Additional contributions are documented below as they are assigned.

### lmokhtar
- Assigned role(s): Technical Lead, Frontend Developer, Real-Time/Game Developer, Developer
- Responsibilities: Co-developed the initial application architecture, implemented the React frontend, built the Pong gameplay and WebSocket flows, and integrated the main user-facing features.

### luctan
- Assigned role(s): Product Owner (PO), Project Manager (PM), Backend Developer, Security Developer
- Responsibilities: Co-developed the initial backend and project structure, coordinated requirements and milestones, implemented authentication, API routes, database integration, and backend security.

### yyaniv
- Assigned role(s): Game Statistics Developer
- Responsibilities: Implemented the minor game-statistics contribution, including match statistics, player records, leaderboard data, and related progression displays.

### rromanov
- Assigned role(s): Accessibility Developer, Internationalization (i18n) Developer, Developer
- Responsibilities: Implemented accessibility compliance across the application (semantic structure, keyboard navigation, visible focus states, skip navigation, ARIA labels, dialog semantics, and accessible Pong controls), and built the multi-language support system (English, French, Spanish) including the translation provider and persistent language switcher.


## Technical stack
- Frontend: React + React Router + CRA
- Backend: Go + Gin
- Database: PostgreSQL
- Real-time: WebSockets
- Deployment: Docker Compose
- Authentication: JWT + bcrypt

## Database schema
The application uses PostgreSQL tables for users, friendships, messages, matches, games, and game reviews.

Key data structures:
- users: id, username, email, password, avatar_url, bio, wins, losses, last_seen
- friendships: id, user_id, friend_id, status, created_at
- messages: id, sender_id, receiver_id, content, created_at
- matches: id, player1_id, player2_id, player1_score, player2_score, winner_id, is_ai, created_at
- games: id, title, genre, cover_image, developer, release_date, platforms, description
- game_reviews: id, game_id, author, rating, title, content, review_date

## Features
- User registration and login
- Secure password hashing and JWT session handling
- Profile updates and avatar upload
- Friend requests and online status
- Real-time chat
- Server-authoritative Pong with WebSockets
- AI opponent mode
- Match history and player stats
- Responsive user interface
- Privacy policy and terms of service
- Dockerized deployment

## Modules and point calculation
The project implements the following coherent module set from the 42 ft_transcendence subject:
- Frontend framework: 1 point. React, React Router, and CRA provide the single-page application structure, reusable components, client-side navigation, and production build workflow.
- Backend framework: 1 point. Go with Gin provides the HTTP API, middleware, route organization, validation, and backend service structure.
- Real-time WebSocket features: 2 points. WebSockets power live chat, presence updates, matchmaking, game state broadcasts, notifications, and reconnection events.
- User interaction: chat + profiles + friends: 2 points. Users can manage profiles, upload avatars, search for users, send or accept friend requests, view online status, and exchange persistent messages.
- Standard user management: 1 point. The project includes signup, signin, JWT sessions, protected routes, bcrypt password hashing, profile updates, and logout handling.
- Web-based multiplayer game: 3 points. Pong runs in the browser with server-authoritative physics, paddle controls, scoring, match completion, history, and persistent statistics.
- Remote players: 2 points. Two authenticated users can be matched from separate browser sessions and play the same Pong match in real time through the WebSocket hub.
- AI opponent: 2 points. The game includes an intentionally imperfect AI with delayed reactions, tracking error, and human-like mistakes instead of perfect paddle movement.
- Advanced chat: 1 point. Chat includes persistent history, profile access, user blocking, game invitations, game notifications, typing indicators, read receipts, and online presence notifications.
- Accessibility support: 2 points. The interface includes semantic structure, keyboard navigation, visible focus states, skip navigation, ARIA labels, dialog semantics, and accessible Pong controls.
- Multiple languages: 1 point. The interface supports English, French, and Spanish through a persistent language switcher and centralized translation provider.

## Individual Contributions

### lmokhtar
- Co-developed the initial project with luctan.
- Implemented the React application structure, navigation, game interface, and major user-facing workflows.
- Contributed to Pong gameplay, WebSocket communication, remote-player flow, reconnection handling, accessibility, and frontend integration.

### luctan
- Co-developed the initial project with lmokhtar.
- Implemented the Go/Gin backend structure, REST API routes, authentication, JWT sessions, password hashing, and PostgreSQL integration.
- Contributed to matchmaking, server-side game coordination, Docker integration, and backend security.

### yyaniv
- Implemented the minor game-statistics contribution.
- Added or maintained match history, wins/losses, player statistics, leaderboard information, and progression-related displays.

### rromanov
- Implemented accessibility support across the interface, including keyboard navigation, ARIA labeling, focus management, and accessible game controls for Pong.
- Built the internationalization system, adding English, French, and Spanish translations along with the language switcher and centralized translation provider.


## Technical choices and justifications
- React was selected to provide a component-based single-page application with reusable UI and predictable state-driven rendering.
- React Router was chosen to provide client-side navigation between authentication, game, profile, chat, and social pages without full page reloads.
- Create React App (CRA) provides a consistent development server, linting, and production build pipeline for the frontend.
- Go was selected for its performance, simple concurrency model, and suitability for a real-time multiplayer backend.
- Gin was chosen because it is lightweight, provides clear HTTP routing and middleware, and integrates cleanly with the Go backend.
- PostgreSQL was chosen for relational data integrity and reliable persistence of users, friendships, messages, matches, achievements, and reviews.
- WebSockets were used for low-latency bidirectional communication, including chat, presence updates, matchmaking, and synchronized Pong state.
- The Pong game is server-authoritative so clients cannot decide the official ball position, score, or match result.
- Docker Compose was used to run the frontend, backend, and PostgreSQL services consistently with isolated networking and persistent volumes.
- JWT provides stateless authenticated sessions between the browser and API, while bcrypt securely hashes user passwords before storage.