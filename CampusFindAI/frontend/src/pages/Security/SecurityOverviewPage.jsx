import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getSecurityOverview, getLoginConfirmation } from '../../api/security';
import { Alert, PageLoading, formatDate } from '../../components/Ui';

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
    <div className="page-container">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{ marginBottom: 32 }}
      >
        <span className="eyebrow">Security Office</span>
        <h1>Security Desk</h1>
        {confirmation && (
          <p className="text-secondary">
            Signed in as <strong>{confirmation.email}</strong>{' '}
            {confirmation.lastLoginAt ? `— last sign-in ${formatDate(confirmation.lastLoginAt)}` : '— first recorded sign-in'}
          </p>
        )}
      </motion.div>

      <Alert type="error">{error}</Alert>

      {loading ? (
        <PageLoading />
      ) : (
        <>
          {/* ── KPI cards ──────────────────────────────────────── */}
          <div className="stat-grid" style={{ marginBottom: 32 }}>
            {[
              {
                iconSvg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
                label: 'Pending Claims', value: overview?.pendingClaimsCount ?? 0,
                to: '/security/claims', toLabel: 'Review queue →', accent: (overview?.pendingClaimsCount ?? 0) > 0,
              },
              {
                iconSvg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
                label: 'AI Suggestions', value: overview?.suggestedMatchesCount ?? 0,
                to: '/security/matches', toLabel: 'Review matches →',
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
                  width: 40, height: 40,
                  borderRadius: 'var(--radius-md)',
                  background: card.accent ? 'var(--accent-bg)' : 'rgba(143,162,138,0.14)',
                  display: 'grid', placeItems: 'center',
                  marginBottom: 8,
                  color: card.accent ? 'var(--accent)' : 'var(--primary-deep)',
                  border: card.accent ? '1px solid var(--accent-border)' : '1px solid rgba(143,162,138,0.22)',
                }}>
                  <div style={{ width: 20, height: 20 }}>{card.iconSvg}</div>
                </div>
                <div className="label">{card.label}</div>
                <div className="value">{card.value}</div>
                <Link to={card.to} className="stat-link">{card.toLabel}</Link>
              </motion.div>
            ))}
          </div>

          {/* ── Priority queue notice ─────────────────────────── */}
          {(overview?.pendingClaimsCount ?? 0) > 0 && (
            <motion.div
              className="card card-pad"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                borderLeft: '4px solid var(--warning)',
                marginBottom: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <p className="font-bold" style={{ marginBottom: 4 }}>
                  {overview.pendingClaimsCount} claim{overview.pendingClaimsCount > 1 ? 's' : ''} awaiting your review
                </p>
                <p className="text-sm text-muted">Students are waiting for your decision on their ownership claims.</p>
              </div>
              <Link to="/security/claims" className="btn btn-primary">Review Claims →</Link>
            </motion.div>
          )}

          {/* ── Quick links ───────────────────────────────────── */}
          <motion.div
            className="card card-pad"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 style={{ marginBottom: 16, fontSize: '1rem' }}>Quick links</h3>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { to: '/security/claims', label: 'Pending Claims' },
                { to: '/security/matches', label: 'AI Matches' },
                { to: '/security/login-history', label: 'Login History' },
              ].map(link => (
                <motion.div key={link.to} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link to={link.to} className="btn btn-secondary btn-sm">{link.label}</Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
