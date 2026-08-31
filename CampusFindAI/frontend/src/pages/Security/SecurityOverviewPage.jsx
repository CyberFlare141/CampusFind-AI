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

  return (
    <div className="page-container-wide">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{ marginBottom: 32 }}
      >
        <span className="eyebrow">Security Office Command</span>
        <h1>Security Desk</h1>
        {confirmation && (
          <p className="text-secondary" style={{ marginTop: 4 }}>
            Signed in as <strong>{confirmation.email}</strong>{' '}
            {confirmation.lastLoginAt ? `· Last recorded sign-in ${formatDate(confirmation.lastLoginAt)}` : '· Initial officer session'}
          </p>
        )}
      </motion.div>

      <Alert type="error">{error}</Alert>

      {loading ? (
        <PageLoading label="Loading security metrics…" />
      ) : (
        <>
          {/* ── KPI Metric Cards ─────────────────────────────────── */}
          <div className="stat-grid" style={{ marginBottom: 32 }}>
            {[
              {
                iconSvg: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
                    <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                  </svg>
                ),
                label: 'Pending Claims',
                value: overview?.pendingClaimsCount ?? 0,
                to: '/security/claims',
                toLabel: 'Review queue →',
                accent: (overview?.pendingClaimsCount ?? 0) > 0,
                sub: (overview?.pendingClaimsCount ?? 0) > 0 ? 'Awaiting officer decision' : 'All claims reviewed',
              },
              {
                iconSvg: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                ),
                label: 'AI Match Suggestions',
                value: overview?.suggestedMatchesCount ?? 0,
                to: '/security/matches',
                toLabel: 'Examine matches →',
                accent: false,
                sub: 'High confidence cross-references',
              },
            ].map((card, i) => (
              <motion.div
                key={card.label}
                className={`stat-card ${card.accent ? 'accent' : ''}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -3, boxShadow: 'var(--shadow-elevated)' }}
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

          {/* ── Priority Queue Notice ───────────────────────────── */}
          {(overview?.pendingClaimsCount ?? 0) > 0 && (
            <motion.div
              className="card card-pad-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                borderLeft: '5px solid var(--warning)',
                marginBottom: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 20,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <p className="font-bold" style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: 4 }}>
                  {overview.pendingClaimsCount} claim{overview.pendingClaimsCount > 1 ? 's' : ''} awaiting verification decision
                </p>
                <p className="text-sm text-secondary">
                  Claimants have submitted ownership details. Review proof notes to approve or reject.
                </p>
              </div>
              <Link to="/security/claims" className="btn btn-primary btn-lg">
                Review Claims Queue →
              </Link>
            </motion.div>
          )}

          {/* ── Quick Tools ─────────────────────────────────────── */}
          <motion.div
            className="card card-pad-lg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 style={{ marginBottom: 16, fontSize: '1.15rem' }}>Security Operations</h3>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {[
                { to: '/security/claims', label: 'Pending Claims Queue' },
                { to: '/security/matches', label: 'AI Suggested Matches' },
                { to: '/security/login-history', label: 'Security Login Audit' },
              ].map(link => (
                <motion.div key={link.to} whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}>
                  <Link to={link.to} className="btn btn-secondary">{link.label}</Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
