import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getMyLostItems } from '../api/lostItems';
import { getMyFoundItems } from '../api/foundItems';
import { getMyClaims } from '../api/claims';
import { getMyMatches } from '../api/matches';
import { getSecurityOverview } from '../api/security';
import { publicAssetUrl } from '../api/client';
import {
  PageLoading, Alert, StatusBadge, formatDate,
  AIBadge, SectionHeader, StaggerList, AnimatedNumber,
  CampusDiscoveryRadar
} from '../components/Ui';

/* ── Stat SVG Icons ──────────────────────────────────────────── */
const StatIcon = ({ name }) => {
  const icons = {
    lost: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
    found: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
    claims: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    ),
    pending: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    matches: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
  };
  return icons[name] || null;
};

/* ── Greeting Helper ─────────────────────────────────────────── */
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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [myLostItems, setMyLostItems] = useState([]);
  const [myFoundItems, setMyFoundItems] = useState([]);
  const [myClaims, setMyClaims] = useState([]);
  const [myMatches, setMyMatches] = useState([]);
  const [overview, setOverview] = useState(null);
  const [dashboardQuery, setDashboardQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const tasks = [getMyLostItems(), getMyFoundItems(), getMyClaims(), getMyMatches()];
        if (isOfficer) tasks.push(getSecurityOverview());
        const results = await Promise.all(tasks);
        if (cancelled) return;
        setMyLostItems(results[0]);
        setMyFoundItems(results[1]);
        setMyClaims(results[2]);
        setMyMatches(results[3]);
        if (isOfficer) setOverview(results[4]);
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

  function submitDashboardSearch(event) {
    event.preventDefault();
    if (dashboardQuery.trim()) navigate('/search?q=' + encodeURIComponent(dashboardQuery.trim()));
  }

  return (
    <div className="page-container-dashboard">
      <Alert type="error">{error}</Alert>

      {/* ── 1. Welcome / Hero Banner (Asymmetric Discovery Layout) ─ */}
      <motion.div
        className="dashboard-hero"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: 'var(--primary-subtle)', borderRadius: 'var(--radius-full)', marginBottom: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 6px var(--primary)' }} />
            <span className="eyebrow" style={{ color: 'var(--primary-deep)', margin: 0, fontSize: '0.72rem' }}>
              Real-Time Campus Discovery
            </span>
          </div>

          <h1 className="dashboard-hero-greeting">
            {getGreeting()}, {displayName} 👋
          </h1>
          <p className="dashboard-hero-sub">
            {isOfficer
              ? 'Security Desk Command — review pending ownership claims, manage AI match suggestions, and audit campus activity.'
              : 'CampusFind AI continuously indexes lost belongings with campus find logs using multi-attribute semantics and verified return handovers.'}
          </p>

          {!isOfficer && (
            <>
              <form className="dashboard-search" onSubmit={submitDashboardSearch}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input value={dashboardQuery} onChange={event => setDashboardQuery(event.target.value)} aria-label="Search campus reports naturally" placeholder="Find what you lost — describe it naturally" />
                <button type="submit" className="btn btn-primary">Search campus</button>
              </form>
              <div className="dashboard-search-examples" aria-label="Example searches">
                {['blue bottle on 4th floor', 'student ID near cafeteria', 'black earbuds in Block C lab'].map(example => <button key={example} type="button" onClick={() => navigate('/search?q=' + encodeURIComponent(example))}>{example}</button>)}
              </div>
            </>
          )}

          {canReportItems && (
            <div className="dashboard-ctas">
              <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}>
                <Link to="/lost-items/new" className="btn btn-primary btn-lg">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  Report Lost Item <span className="btn-arrow">→</span>
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}>
                <Link to="/found-items/new" className="btn btn-secondary btn-lg">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><polyline points="16 3 12 7 8 3"/>
                  </svg>
                  Report Found Item <span className="btn-arrow">→</span>
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}>
                <Link to="/found-items" className="btn btn-secondary btn-lg" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  Claim a Found Item <span className="btn-arrow">→</span>
                </Link>
              </motion.div>
            </div>
          )}

          {isOfficer && (
            <div className="dashboard-ctas">
              <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}>
                <Link to="/security/claims" className="btn btn-primary btn-lg">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                  </svg>
                  Review Claims Queue <span className="btn-arrow">→</span>
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}>
                <Link to="/security/matches" className="btn btn-secondary btn-lg">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  AI Match Suggestions <span className="btn-arrow">→</span>
                </Link>
              </motion.div>
            </div>
          )}
        </div>

        {/* Right Asymmetric Motif Artwork */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px 0' }}>
          <CampusDiscoveryRadar count={myLostItems.length + myFoundItems.length} />
        </div>
      </motion.div>

      {loading ? (
        <PageLoading label="Loading your dashboard…" />
      ) : (
        <>
          {/* ── 2. Key Metrics ───────────────────────────────────── */}
          <div className={isOfficer && overview ? 'stat-grid-5' : 'stat-grid stat-grid-4'} style={{ marginBottom: 36 }}>
            <StaggerList stagger={0.06}>
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
                sub={myFoundItems.length === 0 ? 'No items reported' : `${myFoundItems.length} logged`}
                to="/found-items"
              />
              <DashStatCard
                iconName="claims"
                label="My Claims"
                value={myClaims.length}
                sub={pendingClaims > 0 ? `${pendingClaims} awaiting verification` : 'All claims settled'}
                to="/my-claims"
              />
              {!isOfficer && (
                <DashStatCard
                  iconName="matches"
                  label="AI Matches"
                  value={myMatches.length}
                  accent
                  sub={myMatches.length ? 'Review suggestions' : 'Monitoring reports'}
                  to="/my-matches"
                />
              )}
              {isOfficer && overview && (
                <DashStatCard
                  iconName="pending"
                  label="Pending Claims"
                  value={overview.pendingClaimsCount}
                  accent
                  sub={overview.pendingClaimsCount > 0 ? 'Requires decision' : 'Queue clear'}
                  to="/security/claims"
                />
              )}
              {isOfficer && overview && (
                <DashStatCard
                  iconName="matches"
                  label="AI Matches"
                  value={overview.suggestedMatchesCount}
                  accent
                  sub="High-confidence pairs"
                  to="/security/matches"
                />
              )}
            </StaggerList>
          </div>

          {/* ── 3. AI Smart Matching Spotlight (Student View) ──── */}
          {!isOfficer && myLostItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.45 }}
              style={{ marginBottom: 36 }}
            >
              <div className="ai-match-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <div className="ai-match-title">
                    <span>✦</span> AI Smart Match Radar
                  </div>
                  <span style={{
                    background: 'rgba(255,255,255,0.22)',
                    color: 'white',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 999,
                    backdropFilter: 'blur(8px)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    fontFamily: 'var(--font-display)',
                  }}>
                    Active Monitoring
                  </span>
                </div>

                <p style={{ fontSize: '1.05rem', fontWeight: 600, color: 'rgba(255,255,255,0.95)', marginBottom: 8, maxWidth: 620 }}>
                  CampusFind AI is actively cross-referencing your {myLostItems.length} lost item report{myLostItems.length > 1 ? 's' : ''} against incoming campus found logs.
                </p>
                <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.75)', marginBottom: 20, maxWidth: 580 }}>
                  Matches are ranked by multi-modal similarity including title keywords, time correlation, location proximity, and visual cues.
                </p>
                {myMatches.length > 0 && (
                  <Link to="/my-matches" style={{ display: 'inline-flex', color: 'white', fontSize: '0.86rem', fontWeight: 700, marginBottom: 18, textDecoration: 'underline' }}>
                    {myMatches.length} possible AI match{myMatches.length > 1 ? 'es are' : ' is'} ready to review
                  </Link>
                )}

                <div className="ai-match-bar">
                  <motion.div
                    className="ai-match-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: '82%' }}
                    transition={{ delay: 0.5, duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.70)' }}>
                    Continuous campus matching active
                  </span>
                  <Link to="/lost-items" className="btn" style={{
                    background: 'rgba(255,255,255,0.20)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.35)',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    backdropFilter: 'blur(8px)',
                  }}>
                    View My Lost Reports →
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── 4. Recent Reports (Asymmetric Composition) ───────── */}
          <div className="dashboard-columns" style={{ marginBottom: 36 }}>
            {/* Column 1: Recent Lost Reports (Detail List oriented) */}
            <motion.div
              className="card card-pad"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <SectionHeader title="Recent Lost" linkTo="/lost-items" linkLabel="All lost" />
              {myLostItems.length === 0 ? (
                <ColumnEmptyState
                  iconName="lost"
                  title="No lost reports"
                  message="Report a missing item and AI will start cross-referencing."
                  actionTo={canReportItems ? "/lost-items/new" : null}
                  actionLabel="Report Lost"
                />
              ) : (
                <ul className="recent-list">
                  {myLostItems.slice(0, 4).map(item => (
                    <li key={item.id}>
                      <Link to={`/lost-items/${item.id}`}>{item.title}</Link>
                      <div className="flex items-center justify-between" style={{ marginTop: 4 }}>
                        <span className="text-xs text-muted">{formatDate(item.lostAt ?? item.createdAt)}</span>
                        <StatusBadge status={item.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>

            {/* Column 2: Recent Found Reports (Visual Card / Image Preview oriented) */}
            <motion.div
              className="card card-pad"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.4 }}
            >
              <SectionHeader title="Recent Found" linkTo="/found-items" linkLabel="All found" />
              {myFoundItems.length === 0 ? (
                <ColumnEmptyState
                  iconName="found"
                  title="No found reports"
                  message="Found someone's property on campus? Log it here."
                  actionTo={canReportItems ? "/found-items/new" : null}
                  actionLabel="Report Found"
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {myFoundItems.slice(0, 3).map(item => (
                    <Link
                      key={item.id}
                      to={`/found-items/${item.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: 10,
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--surface-card)',
                        border: '1px solid var(--border)',
                        transition: 'background var(--transition-fast)',
                        textDecoration: 'none',
                      }}
                      className="card-hover"
                    >
                      <div style={{
                        width: 48, height: 48,
                        borderRadius: 'var(--radius-sm)',
                        overflow: 'hidden',
                        background: 'var(--surface)',
                        flexShrink: 0,
                        display: 'grid',
                        placeItems: 'center',
                      }}>
                        {item.imageUrls?.[0] ? (
                          <img src={publicAssetUrl(item.imageUrls[0])} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>📦</span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {formatDate(item.foundAt ?? item.createdAt)}
                        </div>
                      </div>
                      <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Found</span>
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Column 3: My Claims (Status & Timeline oriented) */}
            <motion.div
              className="card card-pad"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16, duration: 0.4 }}
            >
              <SectionHeader title="My Claims" linkTo="/my-claims" linkLabel="All claims" />
              {myClaims.length === 0 ? (
                <ColumnEmptyState
                  iconName="claims"
                  title="No active claims"
                  message="Browse found items and claim property that belongs to you."
                  actionTo="/found-items"
                  actionLabel="Browse Found"
                />
              ) : (
                <ul className="recent-list">
                  {myClaims.slice(0, 4).map(claim => (
                    <li key={claim.id}>
                      <Link to={`/found-items/${claim.foundItemId}`}>{claim.foundItemTitle}</Link>
                      <div className="flex items-center justify-between" style={{ marginTop: 4 }}>
                        <span className="text-xs text-muted">{formatDate(claim.createdAt)}</span>
                        <StatusBadge status={claim.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </div>

          {/* ── 5. Campus Lost & Found Explanatory Guide ─────────── */}
          <div className="guide-card">
            <h3 style={{ fontSize: '1.15rem', marginBottom: 6 }}>How CampusFind AI Works</h3>
            <p className="text-sm text-secondary" style={{ marginBottom: 24, maxWidth: 640 }}>
              CampusFind AI makes lost &amp; found transparent, quick, and verified across all departments.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
              <div className="guide-step">
                <div className="guide-step-num">1</div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', marginBottom: 4 }}>Report in Seconds</h4>
                  <p className="text-sm text-muted">
                    Submit title, location, and photos. AI parses attributes automatically.
                  </p>
                </div>
              </div>
              <div className="guide-step">
                <div className="guide-step-num">2</div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', marginBottom: 4 }}>AI Smart Matching</h4>
                  <p className="text-sm text-muted">
                    Instant comparison between lost and found logs across campus buildings.
                  </p>
                </div>
              </div>
              <div className="guide-step">
                <div className="guide-step-num">3</div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', marginBottom: 4 }}>Verified Handover</h4>
                  <p className="text-sm text-muted">
                    Submit ownership proof and pick up your item safely through the Security Desk.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Metric Stat Card Component ──────────────────────────────── */
function DashStatCard({ iconName, label, value, sub, accent, to }) {
  return (
    <motion.div
      className={`stat-card ${accent ? 'accent' : ''}`}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      <div style={{
        width: 44, height: 44,
        borderRadius: 'var(--radius-md)',
        background: accent ? 'var(--accent-bg)' : 'rgba(143,162,138,0.16)',
        display: 'grid',
        placeItems: 'center',
        marginBottom: 8,
        color: accent ? 'var(--accent-deep)' : 'var(--primary-deep)',
        border: accent ? '1px solid var(--accent-border)' : '1px solid rgba(143,162,138,0.25)',
      }}>
        <div style={{ width: 22, height: 22 }}>
          <StatIcon name={iconName} />
        </div>
      </div>
      <div className="label">{label}</div>
      <div className="value">
        <AnimatedNumber value={value ?? 0} />
      </div>
      {sub && <div className="sub">{sub}</div>}
      {to && (
        <Link to={to} className="stat-link">View all →</Link>
      )}
    </motion.div>
  );
}

/* ── Column Empty State Helper ───────────────────────────────── */
function ColumnEmptyState({ iconName, title, message, actionTo, actionLabel }) {
  const icons = {
    lost: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
    found: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
    claims: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    ),
  };
  return (
    <div style={{ textAlign: 'center', padding: '24px 12px' }}>
      <div style={{
        width: 44, height: 44,
        borderRadius: 'var(--radius-lg)',
        background: 'rgba(143,162,138,0.12)',
        display: 'grid',
        placeItems: 'center',
        margin: '0 auto 10px',
        color: 'var(--primary-deep)',
        border: '1px dashed rgba(143,162,138,0.35)',
      }}>
        {icons[iconName]}
      </div>
      <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 4, fontFamily: 'var(--font-display)' }}>{title}</p>
      <p className="text-xs text-muted" style={{ lineHeight: 1.5, marginBottom: actionTo ? 14 : 0, maxWidth: 220, margin: '0 auto' }}>
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
