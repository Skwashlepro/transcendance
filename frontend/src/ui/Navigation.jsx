import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navigation.css';

function Navigation() {
	const { user, logout } = useAuth();
	return (
		<nav className="navbar">
			<div className="navbar-container">
				<Link to="/" className="navbar-logo">
					GameVault
				</Link>

				<div className="nav-menu">
					<Link to="/" className="nav-link">
						Home
					</Link>
					<Link to="/games" className="nav-link">
						Browse Games
					</Link>
					<Link to="/play" className="nav-link">
						Play
					</Link>
					<Link to="/friends" className="nav-link">
						Friends
					</Link>
					<Link to="/privacy-policy" className="nav-link">
						Privacy
					</Link>
					<Link to="/terms" className="nav-link">
						Terms
					</Link>
					{user ? (
						<>
							<Link to="/chat" className="nav-link">
								Chat
							</Link>
							<Link to={`/profile/${user.username}`} className="nav-link">
								Profile
							</Link>
							<button className="nav-link logout-btn" onClick={logout}>
								Logout
							</button>
						</>
					) : (
						<>
							<Link to="/signin" className="nav-link">
								Sign In
							</Link>
							<Link to="/signup" className="nav-link">
								Sign Up
							</Link>
						</>
					)}
				</div>
			</div>
		</nav>
	);
}

export default Navigation;
