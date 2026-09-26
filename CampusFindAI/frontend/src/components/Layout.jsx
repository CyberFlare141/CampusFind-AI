import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { useAuth } from '../context/AuthContext';
import { PageMotion, BubbleBackground } from './Ui';
import StaticCanvasDecor from './StaticCanvasDecor';
import { getProfile } from '../api/profile';
import { API_BASE_URL, formatBangladeshDate, getToken, publicAssetUrl } from '../api/client';
import { getNotifications, getUnreadNotificationCount, markAllNotificationsRead, markNotificationRead } from '../api/notifications';
import './layout.css';

const notificationHubUrl = `${API_BASE_URL.replace(/\/api\/?$/, '')}/hubs/notifications`;

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
  { to: '/assistant',   label: 'Assistant',    icon: 'matches' },
  { to: '/search',      label: '✦ AI Search',  icon: 'search' },
  { to: '/visual-search', label: 'Visual Search', icon: 'search' },
  { to: '/lost-items',  label: 'Lost Items',   icon: 'lost' },
  { to: '/found-items', label: 'Found Items',  icon: 'found' },
  { to: '/my-claims',   label: 'My Claims',    icon: 'claims' },
  { to: '/my-matches',  label: 'My AI Matches', icon: 'matches' },
];

const OFFICER_LINKS = [
  { to: '/security',               label: 'Security Desk',  icon: 'shield',  end: true },
  { to: '/security/claims',        label: 'Claims Review',  icon: 'claims' },
  { to: '/security/ownership-verifications', label: 'Ownership Reviews', icon: 'shield' },
  { to: '/security/matches',       label: 'AI Matches',     icon: 'matches' },
  { to: '/security/login-history', label: 'Login History',  icon: 'history' },
];

const BOTTOM_NAV_LINKS = [
  { to: '/',            label: 'Home',    icon: 'home',   end: true },
  { to: '/search',      label: 'Search',  icon: 'search' },
  { to: '/visual-search', label: 'Visual Search', icon: 'search' },
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
function getRoleLabel(role, isRestricted) {
  if (role === 'SecurityOfficer') return 'Security';
  if (role === 'Administrator')   return 'Admin';
  return isRestricted ? 'User' : 'Student';
}

function getPageMotionKind(pathname) {
  if (pathname.includes('/chat') || pathname === '/assistant') return 'chat';
  if (pathname.endsWith('/new') || pathname.endsWith('/edit') || pathname.includes('/verify')) return 'form';
  if (/\/(lost|found)-items\/[^/]+$/.test(pathname) || pathname === '/profile' || pathname === '/reputation') return 'detail';
  if (pathname.includes('/lost-items') || pathname.includes('/found-items') || pathname.includes('/matches') || pathname === '/notifications' || pathname.includes('/search')) return 'catalog';
  return 'desk';
}

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const [toastNotification, setToastNotification] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const notificationIds = useRef(new Set());
  const notificationBaselineReady = useRef(false);

  const refreshNotifications = async (showToast = false) => {
    const [page, unread] = await Promise.all([getNotifications(), getUnreadNotificationCount()]);
    const next = page.items || [];
    const newUnread = showToast && notificationBaselineReady.current
      ? next.find(item => !item.isRead && !notificationIds.current.has(item.id))
      : null;
    notificationIds.current = new Set(next.map(item => item.id));
    notificationBaselineReady.current = true;
    setNotifications(next);
    setUnreadNotifications(unread.count || 0);
    if (newUnread && location.pathname !== newUnread.link) {
      setToastNotification(newUnread);
      window.setTimeout(() => setToastNotification(current => current?.id === newUnread.id ? null : current), 6000);
    }
  };

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : '??';
  const displayName = user?.email?.split('@')[0] ?? 'User';
  const canReportItems = !user?.isRestricted && user?.role !== 'Administrator';
  const canAccessSecurityOffice = user?.role === 'SecurityOfficer';

  useEffect(() => {
    let cancelled = false;

    getProfile()
      .then(profile => {
        if (!cancelled) setAvatarUrl(profile?.avatarUrl || null);
      })
      .catch(() => {
        if (!cancelled) setAvatarUrl(null);
      });

    function handleProfileUpdated(event) {
      setAvatarUrl(event.detail?.avatarUrl || null);
    }

    window.addEventListener('profile-updated', handleProfileUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener('profile-updated', handleProfileUpdated);
    };
  }, []);

  const studentLinks = user?.role === 'Administrator'
    ? STUDENT_LINKS.filter(l => !['/search', '/my-claims', '/my-matches'].includes(l.to))
    : (user?.isRestricted || user?.role === 'SecurityOfficer'
      ? STUDENT_LINKS.filter(l => !['/my-claims', '/my-matches'].includes(l.to))
      : STUDENT_LINKS);

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

  async function toggleNotifications() {
    const willOpen = !notificationsOpen;
    setNotificationsOpen(willOpen);
    if (!willOpen) return;

    setNotificationsLoading(true);
    setNotificationsError('');
    try {
      await refreshNotifications();
    } catch (err) {
      setNotificationsError(err.message || 'Could not load notifications.');
    } finally {
      setNotificationsLoading(false);
    }
  }

  async function handleNotificationClick(notification) {
    try {
      if (!notification.isRead) await markNotificationRead(notification.id);
      setNotifications(current => current.map(item =>
        item.id === notification.id ? { ...item, isRead: true } : item
      ));
      setNotificationsOpen(false);
      if (!notification.isRead) setUnreadNotifications(count => Math.max(0, count - 1));
      if (notification.link) navigate(notification.link);
    } catch (err) {
      setNotificationsError(err.message || 'Could not mark the notification as read.');
    }
  }

  useEffect(() => {
    setNotificationsOpen(false);
    setNotifications([]);
    setNotificationsError('');
    setToastNotification(null);
    notificationIds.current = new Set();
    notificationBaselineReady.current = false;
  }, [user?.id]);

  function navClass({ isActive }) {
    return `nav-item ${isActive ? 'active' : ''}`;
  }
  function mobileNavClass({ isActive }) {
    return `mobile-nav-btn ${isActive ? 'active' : ''}`;
  }

  useEffect(() => {
    if (!user) return undefined;
    refreshNotifications(false).catch(() => {});
    const interval = window.setInterval(() => refreshNotifications(true).catch(() => {}), 60_000);
    return () => window.clearInterval(interval);
  }, [user?.id]);

  useEffect(() => {
    if (!user) return undefined;
    const connection = new HubConnectionBuilder().withUrl(notificationHubUrl, { accessTokenFactory: getToken }).withAutomaticReconnect().configureLogging(LogLevel.Warning).build();
    connection.on('NotificationReceived', notification => {
      if (notificationIds.current.has(notification.id)) return;
      notificationIds.current.add(notification.id);
      setNotifications(current => [notification, ...current.filter(item => item.id !== notification.id)].slice(0, 20));
      if (!notification.isRead) setUnreadNotifications(count => count + 1);
      if (location.pathname !== notification.link) {
        setToastNotification(notification);
        window.setTimeout(() => setToastNotification(current => current?.id === notification.id ? null : current), 6000);
      }
    });
    connection.on('NotificationRead', id => {
      setNotifications(current => current.map(item => item.id === id ? { ...item, isRead: true } : item));
      refreshNotifications(false).catch(() => {});
    });
    connection.on('NotificationsRead', () => {
      setNotifications(current => current.map(item => ({ ...item, isRead: true })));
      setUnreadNotifications(0);
    });
    connection.onreconnected(() => refreshNotifications(false).catch(() => {}));
    connection.start().catch(() => {});
    return () => { connection.stop(); };
  }, [user?.id]);

  useEffect(() => {
    const matchingUnread = notifications.filter(item => !item.isRead && item.link === location.pathname);
    if (matchingUnread.length === 0) return;
    matchingUnread.forEach(item => markNotificationRead(item.id).catch(() => {}));
    setNotifications(current => current.map(item => matchingUnread.some(match => match.id === item.id) ? { ...item, isRead: true } : item));
    setUnreadNotifications(count => Math.max(0, count - matchingUnread.length));
  }, [location.pathname, notifications]);

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      setNotifications(current => current.map(item => ({ ...item, isRead: true })));
      setUnreadNotifications(0);
    } catch (err) { setNotificationsError(err.message || 'Could not mark notifications as read.'); }
  }

  function hasUnreadFor(link) {
    return notifications.some(notification => !notification.isRead && notification.link === link);
  }

  function renderNavIndicator(link) {
    return hasUnreadFor(link.to) ? <span className="nav-unread-dot" aria-label="Unread update" /> : null;
  }

  return (
    <div className={'app-shell ' + (collapsed ? 'sidebar-collapsed' : '')}>
      {/* ── Ambient bubble background (decorative, pointer-events: none) */}
      <StaticCanvasDecor />
      <BubbleBackground />

      {/* ── Mobile Topbar ───────────────────────────────────────── */}
      <header className="mobile-topbar">
        <Link to="/" className="mobile-topbar-logo">
          <span className="mobile-topbar-logo-mark">
            <LogoMark />
          </span>
          <span className="mobile-topbar-logo-name">CampusFind AI</span>
        </Link>
        <div className="mobile-topbar-actions"><button className="topbar-action-btn" aria-label="Notifications" onClick={() => navigate('/notifications')}><Icon name="bell" />{unreadNotifications > 0 && <span className="topbar-notif-dot" />}</button><button className="topbar-action-btn" aria-label="Open menu" onClick={() => setDrawerOpen(true)}><Icon name="menu" /></button></div>
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
        <div className="topbar-actions" style={{ position: 'relative' }}>
          <button
            className="topbar-action-btn"
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
            title="Notifications"
            onClick={toggleNotifications}
          >
            <Icon name="bell" />
            {unreadNotifications > 0 && <span className="topbar-notif-dot" />}
          </button>

          <AnimatePresence>
            {notificationsOpen && (
              <motion.div
                className="notification-panel"
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.16 }}
                style={{
                  position: 'absolute', top: 'calc(100% + 10px)', right: 38, width: 340,
                  maxWidth: 'calc(100vw - 32px)', background: 'var(--surface-card, #fff)',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-elevated)', overflow: 'hidden', zIndex: 30,
                }}
              >
                <div className="notification-panel-header"><span>Notifications <small>{unreadNotifications ? `${unreadNotifications} unread` : 'All caught up'}</small></span>{unreadNotifications > 0 && <button type="button" className="btn btn-secondary btn-sm" onClick={handleMarkAllRead}>Mark all read</button>}</div>
                {notificationsLoading ? (
                  <p className="text-sm text-muted" style={{ padding: 16 }}>Loading notifications…</p>
                ) : notificationsError ? (
                  <p className="text-sm" style={{ padding: 16, color: 'var(--danger)' }}>{notificationsError}</p>
                ) : notifications.length === 0 ? (
                  <p className="text-sm text-muted" style={{ padding: 16 }}>You have no notifications yet.</p>
                ) : (
                  <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                    {notifications.map(notification => (
                      <button
                        className="notification-row"
                        key={notification.id}
                        type="button"
                        onClick={() => handleNotificationClick(notification)}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left', padding: '13px 16px',
                          border: 0, borderBottom: '1px solid var(--border)', cursor: notification.isRead ? 'default' : 'pointer',
                          background: notification.isRead ? 'transparent' : 'var(--surface-card-alt, #f5f8f2)', color: 'inherit',
                        }}
                      >
                        <span style={{ display: 'block', fontSize: '0.88rem', fontWeight: notification.isRead ? 400 : 650, lineHeight: 1.4 }}>{notification.message}</span>
                        <span className="text-xs text-muted" style={{ display: 'block', marginTop: 5 }}>
                          {formatBangladeshDate(notification.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <Link to="/notifications" onClick={() => setNotificationsOpen(false)} className="text-sm font-semibold" style={{ display: 'block', padding: '13px 16px', textAlign: 'center', borderTop: '1px solid var(--border)' }}>View all notifications</Link>
              </motion.div>
            )}
          </AnimatePresence>
          <Link
            to="/profile"
            className="topbar-avatar"
            aria-label="Profile"
            title={displayName}
            style={avatarUrl ? { backgroundImage: `url(${publicAssetUrl(avatarUrl)})` } : undefined}
          >
            {!avatarUrl && initials}
          </Link>
          <AnimatePresence>
            {toastNotification && (
              <motion.button
                type="button"
                className="notification-toast"
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                onClick={() => handleNotificationClick(toastNotification)}
              >
                <strong>New update</strong>
                <span>{toastNotification.message}</span>
              </motion.button>
            )}
          </AnimatePresence>
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
                {renderNavIndicator(link)}
              </NavLink>
            ))}

            {user?.isRestricted && <NavLink to="/security-officer-request" className={navClass}>
              <span className="nav-icon"><Icon name="shield" /></span>
              <span className="nav-label">Officer Request</span>
            </NavLink>}

            {canAccessSecurityOffice && (
              <>
                <div className="sidebar-divider" />
                <span className="sidebar-section-label">Security Office</span>
                {OFFICER_LINKS.map(link => (
                  <NavLink key={link.to} to={link.to} end={link.end} className={navClass}>
                    <span className="nav-icon"><Icon name={link.icon} /></span>
                    <span className="nav-label">{link.label}</span>
                    {renderNavIndicator(link)}
                  </NavLink>
                ))}
              </>
            )}

            {user?.role === 'Administrator' && <NavLink to="/admin/analytics" className={navClass}><span className="nav-icon"><Icon name="history" /></span><span className="nav-label">Analytics</span></NavLink>}
            {user?.role === 'Administrator' && <NavLink to="/admin/security-officer-requests" className={navClass}>
              <span className="nav-icon"><Icon name="shield" /></span>
              <span className="nav-label">Officer Requests</span>
            </NavLink>}

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
                <span
                  className="sidebar-avatar"
                  style={avatarUrl ? { backgroundImage: `url(${publicAssetUrl(avatarUrl)})` } : undefined}
                >
                  {!avatarUrl && initials}
                </span>
                <span className="sidebar-user-info">
                  <span className="sidebar-user-name">{displayName}</span>
                  <span className="sidebar-user-role">
                    <span className={getRolePillClass(user?.role)}>
                      {getRoleLabel(user?.role, user?.isRestricted)}
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
          <PageMotion
            key={location.pathname}
            kind={getPageMotionKind(location.pathname)}
            className={`page-motion page-motion--${getPageMotionKind(location.pathname)}`}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            <Outlet />
          </PageMotion>
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
              {hasUnreadFor('/security-officer-request') && <span className="nav-unread-dot" aria-label="Unread update" />}
            </NavLink>
          ))}
          {user?.isRestricted && <NavLink to="/security-officer-request" className={navClass} onClick={() => setDrawerOpen(false)}>
            <span className="nav-icon"><Icon name="shield" /></span><span className="nav-label">Officer Request</span>
          </NavLink>}

          {canAccessSecurityOffice && (
            <>
              <div className="sidebar-divider" />
              <span className="sidebar-section-label">Security Office</span>
              {OFFICER_LINKS.map(link => (
                <NavLink key={link.to} to={link.to} end={link.end}
                  className={navClass}
                  onClick={() => setDrawerOpen(false)}>
                  <span className="nav-icon"><Icon name={link.icon} /></span>
                  <span className="nav-label">{link.label}</span>
                  {renderNavIndicator(link)}
                </NavLink>
              ))}
            </>
          )}
          {user?.role === 'Administrator' && <NavLink to="/admin/analytics" className={navClass} onClick={() => setDrawerOpen(false)}><span className="nav-icon"><Icon name="history" /></span><span className="nav-label">Analytics</span></NavLink>}
          {user?.role === 'Administrator' && <NavLink to="/admin/security-officer-requests" className={navClass} onClick={() => setDrawerOpen(false)}>
            <span className="nav-icon"><Icon name="shield" /></span><span className="nav-label">Officer Requests</span>
            {hasUnreadFor('/admin/security-officer-requests') && <span className="nav-unread-dot" aria-label="Unread update" />}
          </NavLink>}
          <div className="sidebar-divider" />
          <NavLink to="/profile" className={navClass} onClick={() => setDrawerOpen(false)}>
            <span className="nav-icon"><Icon name="user" /></span>
            <span className="nav-label">Profile</span>
          </NavLink>
        </nav>

        <div className="sidebar-bottom">
          <Link to="/profile" className="sidebar-user" onClick={() => setDrawerOpen(false)}>
            <span
              className="sidebar-avatar"
              style={avatarUrl ? { backgroundImage: `url(${publicAssetUrl(avatarUrl)})` } : undefined}
            >
              {!avatarUrl && initials}
            </span>
            <span className="sidebar-user-info">
              <span className="sidebar-user-name">{displayName}</span>
              <span className="sidebar-user-role">
                <span className={getRolePillClass(user?.role)}>{getRoleLabel(user?.role, user?.isRestricted)}</span>
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
          {BOTTOM_NAV_LINKS.filter(link => {
            if (user?.role === 'Administrator' && link.to === '/search') return false;
            if (user?.role === 'SecurityOfficer' && link.to === '/my-claims') return false;
            return true;
          }).map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={mobileNavClass}
            >
              <Icon name={link.icon} />
              <span>{link.label}</span>
              {renderNavIndicator(link)}
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
