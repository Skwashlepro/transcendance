import React, { useEffect, useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './ui/Navigation';
import { I18nProvider, useTranslation } from './i18n';
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

const CONSENT_KEY = 'ft_transcendence_legal_consent';

function LegalConsentModal({ onAccept, onDecline }) {
  const { t } = useTranslation();

  return (
    <div className="legal-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="legal-title" aria-describedby="legal-description">
      <div className="legal-modal">
        <div className="legal-modal-header">
          <h2 id="legal-title">{t('legal.welcome')}</h2>
          <p id="legal-description">{t('legal.subtitle')}</p>
        </div>

        <div className="legal-modal-body">
          <div className="legal-snippet">
            <h3>{t('legal.privacyPolicy')}</h3>
            <p>We only collect the minimum personal information needed to operate your account, profile, friend list, and chat features securely.</p>
            <ul>
              <li>Account and login details</li>
              <li>Profile and avatar data</li>
              <li>Match statistics and chat history</li>
            </ul>
          </div>

          <div className="legal-snippet">
            <h3>{t('legal.termsOfService')}</h3>
            <p>You agree to use the platform responsibly, keep your account secure, and avoid abusive or harmful behavior.</p>
            <ul>
              <li>Respect other players and keep accounts safe</li>
              <li>Do not abuse social or game systems</li>
              <li>Understand that the service may change or be unavailable during maintenance</li>
            </ul>
          </div>
        </div>

        <div className="legal-modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onDecline}>
            {t('legal.refuse')}
          </button>
          <button type="button" className="btn btn-primary" onClick={onAccept}>
            {t('legal.accept')}
          </button>
        </div>
      </div>
    </div>
  );
}

function AppShell() {
  const [consent, setConsent] = useState('pending');
  const { t } = useTranslation();

  useEffect(() => {
    const stored = window.localStorage.getItem(CONSENT_KEY);
    if (stored === 'accepted' || stored === 'declined') {
      setConsent(stored);
    }
  }, []);

  const accept = () => {
    window.localStorage.setItem(CONSENT_KEY, 'accepted');
    setConsent('accepted');
  };

  const refuse = () => {
    window.localStorage.setItem(CONSENT_KEY, 'declined');
    setConsent('declined');
  };

  if (consent === 'pending') {
    return <LegalConsentModal onAccept={accept} onDecline={refuse} />;
  }

  if (consent === 'declined') {
    return (
      <div className="legal-blocked-shell">
        <div className="legal-blocked-card">
          <h2>{t('legal.required')}</h2>
          <p>{t('legal.requiredText')}</p>
          <div className="legal-modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setConsent('pending')}>
              {t('legal.reviewAgain')}
            </button>
            <button type="button" className="btn btn-primary" onClick={accept}>
              {t('legal.acceptNow')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <a className="skip-link" href="#main-content">{t('aria.skipToMain')}</a>
      <Navigation />

      <main className="main-content" id="main-content" tabIndex="-1">
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
          <Route path="*" element={<h1>{t('misc.notFound')}</h1>} />
        </Routes>
      </main>

      <footer className="page-footer">
        <div className="page-footer-inner">
          <span>© 2026 ft_transcendence</span>
          <div className="footer-links">
            <a href="/privacy-policy">{t('misc.privacy')}</a>
            <a href="/terms">{t('misc.terms')}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <WebSocketProvider>
          <Router>
            <AppShell />
          </Router>
        </WebSocketProvider>
      </AuthProvider>
    </I18nProvider>
  );
}

export default App;
