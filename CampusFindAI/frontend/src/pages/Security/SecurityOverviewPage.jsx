import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getSecurityOverview, getLoginConfirmation } from '../../api/security';
import { Alert, PageLoading, formatDate, AnimatedNumber } from '../../components/Ui';

export default function SecurityOverviewPage() {
  const [overview, setOverview] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [overviewData, confirmationData] = await Promise.all([
          getSecurityOverview(),
          getLoginConfirmation(),
        ]);
        if (cancelled) return;
        setOverview(overviewData);
        setConfirmation(confirmationData);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const pending = overview?.pendingClaimsCount ?? 0;

  return (
    <div className="page-container-wide">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{ marginBottom: 28 }}
      >
        <span className="eyebrow">Security Office Command</span>
        <h1>Security Desk</h1>
        <p className="text-secondary" style={{ marginTop: 4 }}>
          Review ownership claims, manage AI match suggestions, and audit campus activity.
          {confirmation && (
            <>
              {' · '}Signed in as <strong>{confirmation.email}</strong>
              {confirmation.lastLoginAt
                ? ` · Last sign-in ${formatDate(confirmation.lastLoginAt)}`
                : ' · Initial officer session'}
            </>
          )}
        </p>
      </motion.div>

      <Alert type="error">{error}</Alert>

      {loading ? (
        <PageLoading label="Loading security metrics…" />
      ) : (
        <>
          {/* ── KPI Metric Cards — 4-column grid ─────────────────── */}
          <div className="stat-grid stat-grid-4" style={{ marginBottom: 28 }}>
            {[
              {
                iconSvg: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                ),
                label: 'Lost Reports',
                value: overview?.lostItemsCount ?? 0,
                to: '/lost-items',
                toLabel: 'Browse reports →',
                accent: false,
                sub: 'Total reported lost',
              },
              {
                iconSvg: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ),
                label: 'Found Reports',
                value: overview?.foundItemsCount ?? 0,
                to: '/found-items',
                toLabel: 'Browse items →',
                accent: false,
                sub: 'Total found & logged',
              },
              {
                iconSvg: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                ),
                label: 'Decisions Made',
                value: overview?.decisionsMadeCount ?? 0,
                to: '/security/claims',
                toLabel: 'Decision history →',
                accent: false,
                sub: 'Approved, rejected, returned',
              },
              {
                iconSvg: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
                    <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                  </svg>
                ),
                label: 'Pending Claims',
                value: pending,
                to: '/security/claims',
                toLabel: 'Review claims →',
                accent: pending > 0,
                sub: pending > 0 ? 'Awaiting officer decision' : 'All claims reviewed',
              },
            ].map((card, i) => (
              <motion.div
                key={card.label}
                className={`stat-card ${card.accent ? 'accent' : ''}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                <div style={{
                  width: 44, height: 44,
                  borderRadius: 'var(--radius-md)',
                  background: card.accent ? 'var(--accent-bg)' : 'rgba(143,162,138,0.16)',
                  display: 'grid', placeItems: 'center',
                  marginBottom: 8,
                  color: card.accent ? 'var(--accent-deep)' : 'var(--primary-deep)',
                  border: card.accent ? '1px solid var(--accent-border)' : '1px solid rgba(143,162,138,0.25)',
                }}>
                  {card.iconSvg}
                </div>
                <div className="label">{card.label}</div>
                <div className="value">
                  <AnimatedNumber value={card.value} />
                </div>
                <div className="sub">{card.sub}</div>
                <Link to={card.to} className="stat-link">{card.toLabel}</Link>
              </motion.div>
            ))}
          </div>

          {/* ── Pending Claims Banner ────────────────────────────── */}
          {pending > 0 && (
            <motion.div
              className="card card-pad-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{
                borderLeft: '5px solid var(--warning)',
                marginBottom: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 20,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <p className="font-bold" style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: 4 }}>
                  {pending} claim{pending > 1 ? 's' : ''} awaiting verification decision
                </p>
                <p className="text-sm text-secondary">
                  Claimants have submitted ownership details. Review proof notes to approve or reject.
                </p>
              </div>
              <Link to="/security/claims" className="btn btn-primary btn-lg">
                Claims Review →
              </Link>
            </motion.div>
          )}

          {/* ── Security Operations Quick Links ─────────────────── */}
          <motion.div
            className="card card-pad-lg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 style={{ marginBottom: 16, fontSize: '1.1rem' }}>Security Operations</h3>

            {/* Primary actions */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
              {[
                { to: '/security/claims',                   label: 'Claims Review' },
                { to: '/security/ownership-verifications',  label: 'Ownership Reviews' },
                { to: '/security/matches',                  label: 'AI Match Suggestions' },
                { to: '/security/login-history',            label: 'Login History' },
              ].map(link => (
                <motion.div key={link.to} whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}>
                  <Link to={link.to} className="btn btn-secondary">{link.label}</Link>
                </motion.div>
              ))}
            </div>

            {/* Secondary / general actions */}
            <p className="text-xs text-muted" style={{ marginBottom: 8, marginTop: 4, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Campus Reports
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { to: '/lost-items',  label: 'Lost Items' },
                { to: '/found-items', label: 'Found Items' },
              ].map(link => (
                <motion.div key={link.to} whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}>
                  <Link to={link.to} className="btn btn-ghost">{link.label}</Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
