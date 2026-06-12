import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './ui/Navigation';
import './App.css';

// Pages
import HomePage from './pages/HomePage';
import BrowseGames from './pages/BrowseGames';
import GameDetail from './pages/GameDetail';
import ReviewGame from './pages/ReviewGame';
import Profile from './pages/Profile';
import Signin from './pages/Signin';
import Signup from './pages/signup';

function App() {
  const [user, setUser] = useState(null);

  return (
    <Router>
      <div className="app">
        <Navigation user={user} />
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/games" element={<BrowseGames />} />
            <Route path="/game/:id" element={<GameDetail />} />
            <Route path="/game/:id/review" element={<ReviewGame />} />
            <Route path="/profile/:username" element={<Profile />} />
            <Route path="/signin" element={<Signin />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="*" element={<h1>404 - Not Found</h1>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
