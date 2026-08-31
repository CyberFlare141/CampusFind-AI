import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getMyLostItems } from '../api/lostItems';
import { getMyFoundItems } from '../api/foundItems';
import { getMyClaims } from '../api/claims';
import { getSecurityOverview } from '../api/security';
import {
  PageLoading, Alert, StatusBadge, formatDate,
  SkeletonGrid, EmptyState, AIBadge, ConfidenceBar, SectionHeader, StaggerList
} from '../components/Ui';

/* ── SVG Icon set ────────────────────────────────────────────── */
const StatIcon = ({ name }) => {
  const icons = {
    lost: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
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
    pending: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    matches: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
  };
  return icons[name] || null;
};

/* ── Greeting helper ─────────────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getTimeEmoji() {
  const h = new Date().getHours();
  if (h < 6)  return '🌙';
  if (h < 12) return '☀️';
  if (h < 17) return '🌤️';
  return '🌙';
}

export default function DashboardPage() {
  const { user, isOfficer } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [myLostItems, setMyLostItems] = useState([]);
  const [myFoundItems, setMyFoundItems] = useState([]);
  const [myClaims, setMyClaims] = useState([]);
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const tasks = [getMyLostItems(), getMyFoundItems(), getMyClaims()];
        if (isOfficer) tasks.push(getSecurityOverview());
        const results = await Promise.all(tasks);
        if (cancelled) return;
        setMyLostItems(results[0]);
        setMyFoundItems(results[1]);
        setMyClaims(results[2]);
        if (isOfficer) setOverview(results[3]);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [isOfficer]);

  const openLostCount   = myLostItems.filter(i => i.status === 'Open').length;
  const pendingClaims   = myClaims.filter(c => c.status === 'Pending').length;
  const canReportItems  = user?.role !== 'Administrator';
  const displayName     = user?.email?.split('@')[0] ?? 'there';

  return (
    <div className="page-container">
      <Alert type="error">{error}</Alert>

      {/* ── Hero greeting ──────────────────────────────────────── */}
      <motion.div
        className="dashboard-hero"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Floating decorative circle */}
        <motion.div
          style={{
            position: 'absolute', width: 280, height: 280, borderRadius: '50%',
            background: 'rgba(143,162,138,0.10)', top: -100, right: -50, pointerEvents: 'none',
          }}
          animate={{ y: [0, -10, 0], scale: [1, 1.04, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          style={{
            position: 'absolute', width: 140, height: 140, borderRadius: '50%',
            background: 'rgba(200,169,107,0.07)', bottom: -40, right: 120, pointerEvents: 'none',
          }}
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <p className="dashboard-hero-eyebrow">{getTimeEmoji()} Dashboard</p>
          <h1 className="dashboard-hero-greeting">
            {getGreeting()}, {displayName} 👋
          </h1>
          <p className="dashboard-hero-sub">
            {isOfficer
              ? 'Security Desk — review claims, verify found items, and manage AI matches.'
              : "Here's what's happening with your items and matches."}
          </p>

          {canReportItems && (
            <div className="dashboard-ctas">
              <motion.div whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}>
                <Link to="/lost-items/new" className="btn btn-primary btn-lg">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  Report Lost Item
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}>
                <Link to="/found-items/new" className="btn btn-secondary btn-lg">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><polyline points="16 3 12 7 8 3"/></svg>
                  Report Found Item
                </Link>
              </motion.div>
            </div>
          )}
          {isOfficer && (
            <div className="dashboard-ctas">
              <motion.div whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}>
                <Link to="/security/claims" className="btn btn-primary btn-lg">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                  Review Claims
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}>
                <Link to="/security/matches" className="btn btn-secondary btn-lg">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  AI Matches
                </Link>
              </motion.div>
            </div>
          )}
        </div>
      </motion.div>

      {loading ? (
        <PageLoading label="Loading your dashboard…" />
      ) : (
        <>
          {/* ── Stats grid ─────────────────────────────────────── */}
          <div className={`${isOfficer && overview ? 'stat-grid-5' : 'stat-grid'}`} style={{ marginBottom: 32 }}>
            <StaggerList stagger={0.07}>
              <DashStatCard
                iconName="lost"
                label="Lost Reports"
                value={myLostItems.length}
                sub={openLostCount > 0 ? `${openLostCount} still open` : 'All resolved'}
                to="/lost-items"
              />
              <DashStatCard
                iconName="found"
                label="Found Reports"
                value={myFoundItems.length}
                sub={myFoundItems.length === 0 ? 'None reported' : `${myFoundItems.length} total`}
                to="/found-items"
              />
              <DashStatCard
                iconName="claims"
                label="My Claims"
                value={myClaims.length}
                sub={pendingClaims > 0 ? `${pendingClaims} pending review` : 'All settled'}
                to="/my-claims"
              />
              {isOfficer && overview && (
                <DashStatCard
                  iconName="pending"
                  label="Pending Claims"
                  value={overview.pendingClaimsCount}
                  accent
                  to="/security/claims"
                />
              )}
              {isOfficer && overview && (
                <DashStatCard
                  iconName="matches"
                  label="AI Matches"
                  value={overview.suggestedMatchesCount}
                  accent
                  to="/security/matches"
                />
              )}
            </StaggerList>
          </div>

          {/* ── AI Match spotlight (student only) ─────────────── */}
          {!isOfficer && myLostItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              style={{ marginBottom: 32 }}
            >
              <SectionHeader title="AI Smart Matching">
                <AIBadge label="Active" />
              </SectionHeader>
              <div className="ai-match-card">
                <div className="ai-match-title">
                  <span>✦</span> AI Smart Matching
                </div>
                <>
                  <p className="ai-match-label" style={{ marginBottom: 8 }}>
                    Our AI is actively scanning found items for your {myLostItems.length} lost report{myLostItems.length > 1 ? 's' : ''}.
                    We'll notify you the moment we find a match.
                  </p>
                  <div className="ai-match-bar">
                    <motion.div
                      className="ai-match-bar-fill"
                      initial={{ width: 0 }}
                      animate={{ width: '75%' }}
                      transition={{ delay: 0.6, duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)', marginBottom: 16 }}>
                    Scanning database… matching in progress
                  </p>
                  <Link to="/lost-items" className="btn" style={{
                    background: 'rgba(255,255,255,0.20)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.30)',
                    fontSize: '0.875rem',
                    backdropFilter: 'blur(8px)',
                    width: 'fit-content',
                  }}>
                    View my reports
                  </Link>
                </>
              </div>
            </motion.div>
          )}

          {/* ── Security officer priority queue ────────────────── */}
          {isOfficer && overview && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{ marginBottom: 32 }}
            >
              <SectionHeader title="Priority Queue" linkTo="/security/claims" linkLabel="View all claims" />
              <div style={{ display: 'grid', gap: 12 }}>
                {overview.pendingClaimsCount === 0 ? (
                  <div className="card card-pad" style={{ textAlign: 'center', padding: '32px 24px' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--success-bg)', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <p className="font-semibold" style={{ marginBottom: 4 }}>All caught up!</p>
                    <p className="text-sm text-muted">No pending claims to review right now.</p>
                  </div>
                ) : (
                  <div className="card card-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                    <div>
                      <p className="font-semibold" style={{ marginBottom: 4 }}>
                        {overview.pendingClaimsCount} pending claim{overview.pendingClaimsCount > 1 ? 's' : ''} awaiting review.
                      </p>
                      <p className="text-sm text-muted">Review and approve or reject each claim.</p>
                    </div>
                    <Link to="/security/claims" className="btn btn-primary" style={{ flexShrink: 0 }}>Review →</Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Recent sections ─────────────────────────────────── */}
          <div className="dashboard-columns">
            <RecentSection
              title="Recent Lost Reports"
              viewAllTo="/lost-items"
              viewAllLabel="View all"
              emptyTitle="No lost reports yet"
              emptyMessage="Lost something? File a report and CampusFind AI will start matching immediately."
              emptyIconName="lost"
              emptyActionTo={canReportItems ? "/lost-items/new" : null}
              emptyActionLabel="Report Lost Item"
              items={myLostItems.slice(0, 5)}
              renderItem={(item) => (
                <li key={item.id}>
                  <Link to={`/lost-items/${item.id}`}>{item.title}</Link>
                  <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
                    <span className="text-xs text-muted">{formatDate(item.createdAt)}</span>
                    <StatusBadge status={item.status} />
                  </div>
                </li>
              )}
            />

            <RecentSection
              title="Recent Found Reports"
              viewAllTo="/found-items"
              viewAllLabel="View all"
              emptyTitle="No found reports yet"
              emptyMessage="Found something on campus? Log it here so the owner can claim it."
              emptyIconName="found"
              emptyActionTo={canReportItems ? "/found-items/new" : null}
              emptyActionLabel="Report Found Item"
              items={myFoundItems.slice(0, 5)}
              renderItem={(item) => (
                <li key={item.id}>
                  <Link to={`/found-items/${item.id}`}>{item.title}</Link>
                  <div style={{ marginTop: 4 }}>
                    <span className="text-xs text-muted">{formatDate(item.foundAt)}</span>
                  </div>
                </li>
              )}
            />

            <RecentSection
              title="My Claims"
              viewAllTo="/my-claims"
              viewAllLabel="View all"
              emptyTitle="No claims filed"
              emptyMessage="Found your lost item? File a claim and we'll connect you with the finder."
              emptyIconName="claims"
              emptyActionTo="/found-items"
              emptyActionLabel="Browse Found Items"
              items={myClaims.slice(0, 5)}
              renderItem={(claim) => (
                <li key={claim.id}>
                  <Link to={`/found-items/${claim.foundItemId}`}>{claim.foundItemTitle}</Link>
                  <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
                    <span className="text-xs text-muted">{formatDate(claim.createdAt)}</span>
                    <StatusBadge status={claim.status} />
                  </div>
                </li>
              )}
            />
          </div>
        </>
      )}
    </div>
  );
}

/* ── Stat card ───────────────────────────────────────────────── */
function DashStatCard({ iconName, label, value, sub, accent, to }) {
  return (
    <motion.div
      className={`stat-card ${accent ? 'accent' : ''}`}
      whileHover={{ y: -3, boxShadow: 'var(--shadow-elevated)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
    >
      <div style={{
        width: 40, height: 40,
        borderRadius: 'var(--radius-md)',
        background: accent ? 'var(--accent-bg)' : 'rgba(143,162,138,0.14)',
        display: 'grid',
        placeItems: 'center',
        marginBottom: 8,
        color: accent ? 'var(--accent)' : 'var(--primary-deep)',
        border: accent ? '1px solid var(--accent-border)' : '1px solid rgba(143,162,138,0.22)',
      }}>
        <div style={{ width: 20, height: 20 }}>
          <StatIcon name={iconName} />
        </div>
      </div>
      <div className="label">{label}</div>
      <div className="value">{value ?? 0}</div>
      {sub && <div className="sub">{sub}</div>}
      {to && (
        <Link to={to} className="stat-link">View all →</Link>
      )}
    </motion.div>
  );
}

/* ── Empty state for recent section ─────────────────────────── */
function SectionEmptyState({ iconName, title, message, actionTo, actionLabel }) {
  const icons = {
    lost:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    found:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    claims: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  };
  return (
    <div style={{
      textAlign: 'center',
      padding: '28px 16px',
    }}>
      <div style={{
        width: 48, height: 48,
        borderRadius: 'var(--radius-lg)',
        background: 'rgba(143,162,138,0.10)',
        display: 'grid',
        placeItems: 'center',
        margin: '0 auto 12px',
        color: 'var(--text-muted)',
        border: '1px dashed rgba(143,162,138,0.30)',
      }}>
        <div style={{ width: 22, height: 22 }}>{icons[iconName]}</div>
      </div>
      <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 4 }}>{title}</p>
      <p className="text-xs text-muted" style={{ lineHeight: 1.5, marginBottom: actionTo ? 14 : 0, maxWidth: 200, margin: '0 auto' }}>
        {message}
      </p>
      {actionTo && (
        <div style={{ marginTop: 12 }}>
          <Link to={actionTo} className="btn btn-primary btn-sm">
            {actionLabel}
          </Link>
        </div>
      )}
    </div>
  );
}

/* ── Recent section card ─────────────────────────────────────── */
function RecentSection({ title, viewAllTo, viewAllLabel, emptyTitle, emptyMessage, emptyIconName, emptyActionTo, emptyActionLabel, items, renderItem }) {
  return (
    <motion.div
      className="card card-pad"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <SectionHeader title={title} linkTo={viewAllTo} linkLabel={viewAllLabel} />
      {items.length === 0 ? (
        <SectionEmptyState
          iconName={emptyIconName}
          title={emptyTitle}
          message={emptyMessage}
          actionTo={emptyActionTo}
          actionLabel={emptyActionLabel}
        />
      ) : (
        <ul className="recent-list">{items.map(renderItem)}</ul>
      )}
    </motion.div>
  );
}
