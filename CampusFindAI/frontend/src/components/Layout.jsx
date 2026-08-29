import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './layout.css';

const STUDENT_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/lost-items', label: 'Lost items' },
  { to: '/found-items', label: 'Found items' },
  { to: '/my-claims', label: 'My claims' },
];

const OFFICER_LINKS = [
  { to: '/security', label: 'Security overview', end: true },
  { to: '/security/claims', label: 'Claims' },
  { to: '/security/matches', label: 'Matches' },
  { to: '/security/login-history', label: 'Login history' },
];

export default function Layout() {
  const { user, isOfficer, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : '??';
  const navigationLinks = user?.role === 'Administrator'
    ? STUDENT_LINKS.filter((link) => link.to !== '/my-claims')
    : STUDENT_LINKS;

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  function navClass({ isActive }) {
    return `nav-link ${isActive ? 'nav-link-active' : ''}`;
  }

  return (
    <div className="app-shell">
      <header className="navbar">
        <NavLink to="/" className="navbar-brand" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark" aria-hidden="true">⌕</span>
          <span>
            <span className="brand-name">CampusFind AI</span>
            <span className="brand-tag">Lost &amp; Found</span>
          </span>
        </NavLink>

        <button className="menu-toggle" aria-label="Toggle navigation menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} type="button">
          <span /><span /><span />
        </button>

        <nav className={`navbar-nav ${menuOpen ? 'navbar-nav-open' : ''}`}>
          <div className="navbar-links">
            {navigationLinks.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={navClass} onClick={() => setMenuOpen(false)}>
                {link.label}
              </NavLink>
            ))}
            {isOfficer && (
              <>
                <span className="nav-section-label">Security</span>
                {OFFICER_LINKS.map((link) => (
                  <NavLink key={link.to} to={link.to} end={link.end} className={navClass} onClick={() => setMenuOpen(false)}>
                    {link.label}
                  </NavLink>
                ))}
              </>
            )}
          </div>
          <div className="navbar-account">
            <NavLink to="/profile" className="user-chip" onClick={() => setMenuOpen(false)}>
              <span className="avatar" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="3.25" /><path d="M5.5 20c.6-3.4 3.1-5.2 6.5-5.2s5.9 1.8 6.5 5.2" /></svg>
              </span>
              <span className="user-chip-info">
                <span className="user-email">Profile</span>
                <span className="user-role" title={user?.email}>{user?.email}</span>
              </span>
            </NavLink>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout} type="button">Log out</button>
          </div>
        </nav>
      </header>

      {menuOpen && <button className="navbar-backdrop" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
      <div className="app-main"><main className="app-content"><Outlet /></main></div>
    </div>
  );
}
