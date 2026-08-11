import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n';
import './signup.css';

function Signup() {
	const navigate = useNavigate();
	const location = useLocation();
	const { signup } = useAuth();
	const { t } = useTranslation();
	const [username, setUsername] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');
		setLoading(true);

		try {
			await signup(username, email, password);
			navigate(location.state?.from || '/play', { replace: true, state: location.state });
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="auth-page">
			<div className="auth-card">
				<h2>{t('auth.signUp')}</h2>
				{error && <div className="alert alert-error">{error}</div>}
				<form onSubmit={handleSubmit}>
					<div className="form-group">
						<label htmlFor="username">{t('auth.username')}</label>
						<input
							type="text"
							id="username"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							required
							autoComplete="username"
						/>
					</div>
					<div className="form-group">
						<label htmlFor="email">{t('auth.email')}</label>
						<input
							type="email"
							id="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							autoComplete="email"
						/>
					</div>
					<div className="form-group">
						<label htmlFor="password">{t('auth.password')}</label>
						<input
							type="password"
							id="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							minLength="8"
							autoComplete="new-password"
						/>
					</div>
					<button type="submit" disabled={loading} className="btn-primary">
						{loading ? t('auth.creatingAccount') : t('auth.signUp')}
					</button>
				</form>
				<div className="auth-link">
					<p>{t('auth.haveAccount')} <Link to="/signin">{t('auth.signIn')}</Link></p>
				</div>
			</div>
		</div>
	);
}

export default Signup;
