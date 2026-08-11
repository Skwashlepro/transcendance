import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './ui/Navigation';
import './App.css';

// Pages
import HomePage from './pages/HomePage';
import BrowseGames from './pages/BrowseGames';
import GameDetail from './pages/GameDetail';
import ReviewGame from './pages/ReviewGame';
import Play from './pages/Play';
import Chat from './pages/Chat';
import Friends from './friends/Friends';
import Profile from './pages/Profile';
import Signin from './pages/Signin';
import Signup from './pages/signup';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';

function App() {
	return (
		<AuthProvider>
			<Router>
				<div className="app">
					<Navigation />

					<main className="main-content">
						<Routes>
							<Route path="/" element={<HomePage />} />
							<Route path="/games" element={<BrowseGames />} />
							<Route path="/play" element={<Play />} />
							<Route path="/friends" element={<Friends />} />
							<Route path="/chat" element={<Chat />} />
							<Route path="/chat/:username" element={<Chat />} />
							<Route path="/game/:id" element={<GameDetail />} />
							<Route path="/game/:id/review" element={<ReviewGame />} />
							<Route path="/profile/:username" element={<Profile />} />
							<Route path="/signin" element={<Signin />} />
							<Route path="/signup" element={<Signup />} />
							<Route path="/privacy-policy" element={<PrivacyPolicy />} />
							<Route path="/terms" element={<TermsOfService />} />
							<Route path="*" element={<h1>404 - Not Found</h1>} />
						</Routes>
					</main>

					<footer className="page-footer">
						<div className="page-footer-inner">
							<span>© 2026 ft_transcendence</span>
							<div className="footer-links">
								<a href="/privacy-policy">Privacy Policy</a>
								<a href="/terms">Terms of Service</a>
							</div>
						</div>
					</footer>
				</div>
			</Router>
		</AuthProvider>
	);
}

export default App;
