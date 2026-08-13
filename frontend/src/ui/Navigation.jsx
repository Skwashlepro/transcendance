import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation, getAvailableLanguages } from '../i18n';
import NotificationCenter from './NotificationCenter';
import './Navigation.css';

function Navigation() {
	const { user, logout } = useAuth();
	const { t, locale, setLocale } = useTranslation();
	const languages = getAvailableLanguages();

	return (
		<nav className="navbar" aria-label={t('nav.language')}>
			<div className="navbar-container">
				<Link to="/" className="navbar-logo" aria-label={t('app.title')}>
					GameVault
				</Link>

				<div className="nav-menu">
					<NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
						{t('nav.home')}
					</NavLink>
					<NavLink to="/games" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
						{t('nav.games')}
					</NavLink>
					<NavLink to="/play" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
						{t('nav.play')}
					</NavLink>
					<NavLink to="/friends" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
						{t('nav.friends')}
					</NavLink>
					{user ? (
						<>
							<NavLink to="/chat" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
								{t('nav.chat')}
							</NavLink>
							<NavLink to={`/profile/${user.username}`} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
								{t('nav.profile')}
							</NavLink>
							<button className="nav-link logout-btn" onClick={logout} aria-label={t('nav.logout')}>
								{t('nav.logout')}
							</button>
						</>
					) : (
						<>
							<NavLink to="/signin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
								{t('nav.signin')}
							</NavLink>
							<NavLink to="/signup" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
								{t('nav.signup')}
							</NavLink>
						</>
					)}
					<NotificationCenter />
					<label className="language-picker" aria-label={t('aria.languageSelector')}>
						<span>{t('nav.language')}</span>
						<select value={locale} onChange={(e) => setLocale(e.target.value)} aria-label={t('nav.language')}>
							{languages.map((lang) => (
								<option key={lang} value={lang}>{lang.toUpperCase()}</option>
							))}
						</select>
					</label>
				</div>
			</div>
		</nav>
	);
}

export default Navigation;
