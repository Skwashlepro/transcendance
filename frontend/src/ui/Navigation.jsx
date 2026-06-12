import React from 'react';
import { Link } from 'react-router-dom';
import './Navigation.css';

function Navigation({ user }) {
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
              <button className="nav-link logout-btn">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">
                Login
              </Link>
              <Link to="/signup" className="nav-link signup">
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
