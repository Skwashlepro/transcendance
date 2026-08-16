# ft_transcendence

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
Project team: [To be filled by the student team]
Repository owner: Skwashlepro

## Project management
- Sprint planning: [To be filled by the team]
- Task tracking: [To be filled by the team]
- Review process: [To be filled by the team]

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
- Frontend framework: 1 point
- Backend framework: 1 point
- Real-time WebSocket features: 2 points
- User interaction: chat + profiles + friends: 2 points
- Standard user management: 1 point
- Web-based multiplayer game: 3 points
- Remote players: 2 points
- AI opponent: 2 points
- Advanced chat: 1 point
- Accessibility support: 2 points
- Multiple languages: 1 point

## Individual contributions
- [To be filled by the team]
- [To be filled by the team]
- [To be filled by the team]

## Technical choices and justifications
- React was selected to provide a fast and familiar SPA frontend.
- Gin was retained because it is lightweight, fast, and compatible with the existing Go backend.
- PostgreSQL was chosen for reliability and data integrity.
- WebSockets were used to keep multiplayer game state synchronized in real time.
- Docker Compose was used to simplify local deployment and keep service orchestration predictable.
- JWT + bcrypt combine strong session creation and password protection.

## Final note
This repository is intended to be an original implementation tailored to the course requirements, with placeholders used where team-specific information is not available.
