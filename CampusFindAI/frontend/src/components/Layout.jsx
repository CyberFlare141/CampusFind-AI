import { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import './layout.css';

/* ── Inline SVG Icon System ─────────────────────────────────── */
const Icon = ({ name }) => {
  const icons = {
    home: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
    search: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
    lost: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
    found: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
    claims: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    ),
    bell: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
      </svg>
    ),
    user: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
    shield: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    list: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
    ),
    logout: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
    ),
    collapse: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
    ),
    expand: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    ),
    matches: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    history: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    plus: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    ),
    menu: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
      </svg>
    ),
    x: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    ),
  };
  return icons[name] || null;
};

/* ── Brand Logo Mark ─────────────────────────────────────────── */
const LogoMark = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7"/>
    <path d="M11 8v3l2 2"/>
    <line x1="16.5" y1="16.5" x2="21" y2="21"/>
  </svg>
);

/* ── Nav Links ───────────────────────────────────────────────── */
const STUDENT_LINKS = [
  { to: '/',            label: 'Dashboard',    icon: 'home',   end: true },
  { to: '/search',      label: '✦ AI Search',  icon: 'search' },
  { to: '/lost-items',  label: 'Lost Items',   icon: 'lost' },
  { to: '/found-items', label: 'Found Items',  icon: 'found' },
  { to: '/my-claims',   label: 'My Claims',    icon: 'claims' },
];

const OFFICER_LINKS = [
  { to: '/security',               label: 'Security Desk',  icon: 'shield',  end: true },
  { to: '/security/claims',        label: 'Claims Review',  icon: 'claims' },
  { to: '/security/matches',       label: 'AI Matches',     icon: 'matches' },
  { to: '/security/login-history', label: 'Login History',  icon: 'history' },
];

const BOTTOM_NAV_LINKS = [
  { to: '/',            label: 'Home',    icon: 'home',   end: true },
  { to: '/search',      label: 'Search',  icon: 'search' },
  { to: '/lost-items',  label: 'Lost',    icon: 'lost' },
  { to: '/found-items', label: 'Found',   icon: 'found' },
  { to: '/my-claims',   label: 'Claims',  icon: 'claims' },
  { to: '/profile',     label: 'Profile', icon: 'user' },
];

function getRolePillClass(role) {
  if (role === 'SecurityOfficer') return 'role-pill role-pill-officer';
  if (role === 'Administrator')   return 'role-pill role-pill-admin';
  return 'role-pill role-pill-student';
}
function getRoleLabel(role) {
  if (role === 'SecurityOfficer') return 'Security';
  if (role === 'Administrator')   return 'Admin';
  return 'Student';
}

export default function Layout() {
  const { user, isOfficer, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : '??';
  const displayName = user?.email?.split('@')[0] ?? 'User';
  const canReportItems = user?.role !== 'Administrator';

  const studentLinks = user?.role === 'Administrator'
    ? STUDENT_LINKS.filter(l => l.to !== '/my-claims')
    : STUDENT_LINKS;

  const SUGGESTIONS = [
    'Black leather wallet near library',
    'Blue hydroflask bottle yesterday',
    'Keys with red campus lanyard',
    'AirPods case in Science Complex',
  ];

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  function handleSearchKeyDown(e) {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const q = searchQuery.trim();
      setSearchFocused(false);
      setSearchQuery('');
      navigate(`/search?q=${encodeURIComponent(q)}`);
    }
  }

  function handleSuggestionClick(text) {
    setSearchFocused(false);
    setSearchQuery('');
    navigate(`/search?q=${encodeURIComponent(text)}`);
  }

  function navClass({ isActive }) {
    return `nav-item ${isActive ? 'active' : ''}`;
  }
  function mobileNavClass({ isActive }) {
    return `mobile-nav-btn ${isActive ? 'active' : ''}`;
  }

  return (
    <div className="app-shell">
      {/* ── Mobile Topbar ───────────────────────────────────────── */}
      <header className="mobile-topbar">
        <Link to="/" className="mobile-topbar-logo">
          <span className="mobile-topbar-logo-mark">
            <LogoMark />
          </span>
          <span className="mobile-topbar-logo-name">CampusFind AI</span>
        </Link>
        <button className="topbar-action-btn" aria-label="Open menu" onClick={() => setDrawerOpen(true)}>
          <Icon name="menu" />
        </button>
      </header>

      {/* ── Desktop Top Bar ─────────────────────────────────────── */}
      <header className="topbar">
        {/* AI Search Signature Component with Suggestions Popover */}
        <div className="ai-search-wrap">
          <span className="ai-search-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input
            className="ai-search"
            type="search"
            placeholder="Search naturally… e.g. black leather wallet near library yesterday"
            aria-label="AI-powered search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 220)}
          />
          <span className="ai-search-indicator">✦ AI Search</span>

          {/* Suggestions Dropdown */}
          <AnimatePresence>
            {searchFocused && (
              <motion.div
                className="ai-search-suggestions"
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="ai-suggestions-header">
                  <span>✦ AI Suggested Prompts</span>
                  <span>Press Enter to search</span>
                </div>
                <div className="ai-suggestions-list">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="ai-suggestion-chip"
                      onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(suggestion); }}
                    >
                      <span className="spark">✦</span>
                      <span>{suggestion}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Actions */}
        <div className="topbar-actions">
          <button className="topbar-action-btn" aria-label="Notifications" title="Notifications">
            <Icon name="bell" />
            <span className="topbar-notif-dot" />
          </button>
          <Link to="/profile" className="topbar-avatar" aria-label="Profile" title={displayName}>
            {initials}
          </Link>
        </div>
      </header>

      {/* ── Main Body ───────────────────────────────────────────── */}
      <div className="app-body">
        {/* ── Sidebar ─────────────────────────────────────────── */}
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`} aria-label="Main navigation">
          {/* Brand Logo */}
          <Link to="/" className="sidebar-logo">
            <span className="sidebar-logo-mark"><LogoMark /></span>
            <span className="sidebar-logo-text">
              <span className="sidebar-logo-name">CampusFind AI</span>
              <span className="sidebar-logo-tag">Campus Lost &amp; Found</span>
            </span>
          </Link>

          {/* Navigation */}
          <nav className="sidebar-nav">
            {studentLinks.map(link => (
              <NavLink key={link.to} to={link.to} end={link.end} className={navClass}>
                <span className="nav-icon"><Icon name={link.icon} /></span>
                <span className="nav-label">{link.label}</span>
              </NavLink>
            ))}

            {isOfficer && (
              <>
                <div className="sidebar-divider" />
                <span className="sidebar-section-label">Security Office</span>
                {OFFICER_LINKS.map(link => (
                  <NavLink key={link.to} to={link.to} end={link.end} className={navClass}>
                    <span className="nav-icon"><Icon name={link.icon} /></span>
                    <span className="nav-label">{link.label}</span>
                  </NavLink>
                ))}
              </>
            )}

            <div className="sidebar-divider" />
            <NavLink to="/profile" className={navClass}>
              <span className="nav-icon"><Icon name="user" /></span>
              <span className="nav-label">Profile</span>
            </NavLink>
          </nav>

          {/* Bottom area: user + logout */}
          <div className="sidebar-bottom">
            <div style={{ marginBottom: 6 }}>
              <Link to="/profile" className="sidebar-user">
                <span className="sidebar-avatar">{initials}</span>
                <span className="sidebar-user-info">
                  <span className="sidebar-user-name">{displayName}</span>
                  <span className="sidebar-user-role">
                    <span className={getRolePillClass(user?.role)}>
                      {getRoleLabel(user?.role)}
                    </span>
                  </span>
                </span>
              </Link>
            </div>
            <button className="sidebar-logout" onClick={handleLogout}>
              <span className="nav-icon" style={{ flexShrink: 0 }}><Icon name="logout" /></span>
              <span>Sign out</span>
            </button>

            {/* Collapse toggle */}
            <button
              className="sidebar-collapse-btn"
              onClick={() => setCollapsed(c => !c)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Icon name={collapsed ? 'expand' : 'collapse'} />
              {!collapsed && <span>Collapse</span>}
            </button>
          </div>
        </aside>

        {/* ── Content ─────────────────────────────────────────── */}
        <main className="app-content">
          <motion.div
            key="page"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      {/* ── Mobile Drawer Backdrop ─────────────────────────────── */}
      <div
        className={`mobile-drawer-backdrop ${drawerOpen ? 'open' : ''}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* ── Mobile Drawer ──────────────────────────────────────── */}
      <div className={`mobile-drawer ${drawerOpen ? 'open' : ''}`} aria-label="Navigation menu">
        <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/" className="sidebar-logo" style={{ textDecoration: 'none', padding: 0, border: 'none' }} onClick={() => setDrawerOpen(false)}>
            <span className="sidebar-logo-mark"><LogoMark /></span>
            <span className="sidebar-logo-text">
              <span className="sidebar-logo-name">CampusFind AI</span>
            </span>
          </Link>
          <button className="topbar-action-btn" onClick={() => setDrawerOpen(false)} aria-label="Close menu">
            <Icon name="x" />
          </button>
        </div>

        <nav className="sidebar-nav" style={{ flex: 1 }}>
          {studentLinks.map(link => (
            <NavLink key={link.to} to={link.to} end={link.end}
              className={navClass}
              onClick={() => setDrawerOpen(false)}>
              <span className="nav-icon"><Icon name={link.icon} /></span>
              <span className="nav-label">{link.label}</span>
            </NavLink>
          ))}

          {isOfficer && (
            <>
              <div className="sidebar-divider" />
              <span className="sidebar-section-label">Security Office</span>
              {OFFICER_LINKS.map(link => (
                <NavLink key={link.to} to={link.to} end={link.end}
                  className={navClass}
                  onClick={() => setDrawerOpen(false)}>
                  <span className="nav-icon"><Icon name={link.icon} /></span>
                  <span className="nav-label">{link.label}</span>
                </NavLink>
              ))}
            </>
          )}
          <div className="sidebar-divider" />
          <NavLink to="/profile" className={navClass} onClick={() => setDrawerOpen(false)}>
            <span className="nav-icon"><Icon name="user" /></span>
            <span className="nav-label">Profile</span>
          </NavLink>
        </nav>

        <div className="sidebar-bottom">
          <Link to="/profile" className="sidebar-user" onClick={() => setDrawerOpen(false)}>
            <span className="sidebar-avatar">{initials}</span>
            <span className="sidebar-user-info">
              <span className="sidebar-user-name">{displayName}</span>
              <span className="sidebar-user-role">
                <span className={getRolePillClass(user?.role)}>{getRoleLabel(user?.role)}</span>
              </span>
            </span>
          </Link>
          <button className="sidebar-logout" onClick={() => { setDrawerOpen(false); handleLogout(); }}>
            <span className="nav-icon" style={{ flexShrink: 0 }}><Icon name="logout" /></span>
            <span>Sign out</span>
          </button>
        </div>
      </div>

      {/* ── Mobile Bottom Nav ──────────────────────────────────── */}
      <nav className="mobile-nav" aria-label="Bottom navigation">
        <div className="mobile-nav-inner">
          {BOTTOM_NAV_LINKS.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={mobileNavClass}
            >
              <Icon name={link.icon} />
              <span>{link.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* ── Mobile FAB ─────────────────────────────────────────── */}
      {canReportItems && (
        <div className="mobile-fab-group">
          <AnimatePresence>
            {fabOpen && (
              <motion.div
                className="fab-menu"
                initial={{ opacity: 0, y: 16, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.9 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link to="/found-items/new" className="fab-menu-item" onClick={() => setFabOpen(false)}>
                  <span className="fab-menu-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><polyline points="16 3 12 7 8 3"/></svg>
                  </span>
                  Report Found Item
                </Link>
                <Link to="/lost-items/new" className="fab-menu-item" onClick={() => setFabOpen(false)}>
                  <span className="fab-menu-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </span>
                  Report Lost Item
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
          <motion.button
            className="mobile-fab"
            onClick={() => setFabOpen(o => !o)}
            aria-label="Report an item"
            aria-expanded={fabOpen}
            whileTap={{ scale: 0.94 }}
          >
            <motion.span
              animate={{ rotate: fabOpen ? 45 : 0 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="plus" />
            </motion.span>
          </motion.button>
        </div>
      )}
    </div>
  );
}
