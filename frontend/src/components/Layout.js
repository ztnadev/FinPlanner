import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="nav-container">
          <Link to="/" className="nav-logo">
            <span className="logo-icon">💰</span>
            Financial Tracker
          </Link>
          <div className="nav-menu">
            <Link
              to="/"
              className={location.pathname === '/' ? 'nav-link active' : 'nav-link'}
            >
              Dashboard
            </Link>
            <Link
              to="/transactions"
              className={location.pathname === '/transactions' ? 'nav-link active' : 'nav-link'}
            >
              Transactions
            </Link>
            <div className="nav-user">
              <span>{user?.name}</span>
              <button onClick={logout} className="btn-logout">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;
