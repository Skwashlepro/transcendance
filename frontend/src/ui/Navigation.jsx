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
					<Link to="/games" className="nav-link">
						Browse Games
					</Link>
					<Link to="/friends" className="nav-link">
						Friends
					</Link>
					{user ? (
						<>
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
						</>
					)}
				</div>
			</div>
		</nav>
	);
}

export default Navigation;
