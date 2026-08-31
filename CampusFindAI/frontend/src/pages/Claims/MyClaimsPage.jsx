import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getMyClaims } from '../../api/claims';
import { Alert, EmptyState, PageLoading, StatusBadge, formatDate } from '../../components/Ui';

const STATUS_STEPS = ['Pending', 'Verification', 'Approved', 'Handover'];

function ClaimTimeline({ status }) {
  const currentStep = STATUS_STEPS.indexOf(status);
  const isRejected = status === 'Rejected';

  return (
    <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {STATUS_STEPS.map((step, i) => {
          const isDone = !isRejected && (i < currentStep || (currentStep === -1 && i === 0));
          const isCurrent = !isRejected && i === currentStep;
          return (
            <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < STATUS_STEPS.length - 1 ? 1 : 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: isCurrent ? 'var(--primary)' : isDone ? 'var(--primary-deep)' : 'var(--surface-tinted)',
                border: `2px solid ${isCurrent || isDone ? 'var(--primary)' : 'var(--border)'}`,
                display: 'grid', placeItems: 'center',
                fontSize: '0.74rem', fontWeight: 800,
                color: isCurrent || isDone ? 'white' : 'var(--text-muted)',
                flexShrink: 0,
                transition: 'all var(--dur-interaction) var(--ease-smooth)',
                boxShadow: isCurrent ? '0 0 0 3.5px var(--primary-subtle)' : 'none',
              }}>
                {isDone ? '✓' : i + 1}
              </div>
              <div style={{
                fontSize: '0.78rem',
                fontWeight: isCurrent ? 800 : 600,
                color: isCurrent ? 'var(--primary-deep)' : 'var(--text-muted)',
                whiteSpace: 'nowrap',
                marginLeft: 8,
                marginRight: 12,
                fontFamily: 'var(--font-display)',
              }}>
                {step}
              </div>
              {i < STATUS_STEPS.length - 1 && (
                <div style={{
                  flex: 1,
                  height: 2,
                  background: isDone ? 'var(--primary)' : 'var(--border)',
                  marginRight: 8,
                  transition: 'background var(--dur-interaction) var(--ease-smooth)',
                }} />
              )}
            </div>
          );
        })}
      </div>
      {isRejected && (
        <p className="text-xs font-semibold" style={{ color: 'var(--danger)', marginTop: 8 }}>
          Claim was reviewed and declined by Security.
        </p>
      )}
    </div>
  );
}

export default function MyClaimsPage() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await getMyClaims();
        if (!cancelled) setClaims(data);
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
    <div className="page-container-claims">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div>
          <span className="eyebrow">Ownership Verification Journey</span>
          <h1>My Claims</h1>
          <p className="text-secondary">Track the real-time review status of your item ownership claims.</p>
        </div>
        <Link to="/found-items" className="btn btn-secondary btn-sm">
          Browse Found Items <span className="btn-arrow">→</span>
        </Link>
      </motion.div>

      <Alert type="error">{error}</Alert>

      {/* ── Visual Ownership Journey Pathway ───────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        style={{ marginBottom: 32 }}
      >
        <div className="journey-grid">
          <div className="journey-card">
            <div className="journey-num">1</div>
            <h4 style={{ fontSize: '0.92rem', marginBottom: 4, fontFamily: 'var(--font-display)' }}>Find Item</h4>
            <p className="text-xs text-muted" style={{ lineHeight: 1.5 }}>
              Browse the campus directory or receive an AI match alert.
            </p>
          </div>
          <div className="journey-card">
            <div className="journey-num">2</div>
            <h4 style={{ fontSize: '0.92rem', marginBottom: 4, fontFamily: 'var(--font-display)' }}>Submit Proof</h4>
            <p className="text-xs text-muted" style={{ lineHeight: 1.5 }}>
              Provide distinguishing details only the true owner knows.
            </p>
          </div>
          <div className="journey-card" style={{ borderLeft: '3px solid var(--accent)' }}>
            <div className="journey-num" style={{ background: 'var(--accent-bg)', color: 'var(--accent-deep)' }}>3</div>
            <h4 style={{ fontSize: '0.92rem', marginBottom: 4, fontFamily: 'var(--font-display)' }}>Security Review</h4>
            <p className="text-xs text-muted" style={{ lineHeight: 1.5 }}>
              Officers verify proof notes against confidential intake records.
            </p>
          </div>
          <div className="journey-card">
            <div className="journey-num">4</div>
            <h4 style={{ fontSize: '0.92rem', marginBottom: 4, fontFamily: 'var(--font-display)' }}>Reunited</h4>
            <p className="text-xs text-muted" style={{ lineHeight: 1.5 }}>
              Safe item handover at the campus Security Desk.
            </p>
          </div>
        </div>
      </motion.div>

      {loading ? (
        <PageLoading label="Loading your claims…" />
      ) : claims.length === 0 ? (
        <EmptyState
          svgIcon={(
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 32, height: 32 }}>
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
          )}
          title="No active claims filed yet"
          message="When you identify an item in the campus Found catalog as yours, submit a claim and its live verification progress will appear here."
          action={(
            <Link to="/found-items" className="btn btn-primary btn-lg">
              Browse Campus Found Items <span className="btn-arrow">→</span>
            </Link>
          )}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {claims.map((claim, i) => (
            <motion.div
              key={claim.id}
              className="card card-pad-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.28), duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
                <div>
                  <Link to={`/found-items/${claim.foundItemId}`} className="font-bold" style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                    {claim.foundItemTitle}
                  </Link>
                  <p className="text-xs text-muted" style={{ marginTop: 3 }}>
                    Filed on {formatDate(claim.createdAt)}
                  </p>
                </div>
                <StatusBadge status={claim.status} />
              </div>

              {claim.claimantNotes && (
                <div style={{ marginBottom: 14, padding: '12px 16px', background: 'var(--surface-card-alt)', borderRadius: 'var(--radius-md)', fontSize: '0.88rem', lineHeight: 1.6, border: '1px solid var(--border)' }}>
                  <strong style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                    Your Ownership Notes:
                  </strong>
                  {claim.claimantNotes}
                </div>
              )}

              {claim.decisionNotes && (
                <div style={{
                  marginBottom: 14,
                  padding: '12px 16px',
                  background: claim.status === 'Approved' ? 'var(--success-bg)' : 'var(--danger-bg)',
                  borderRadius: 'var(--radius-md)',
                  color: claim.status === 'Approved' ? 'var(--success)' : 'var(--danger)',
                  fontSize: '0.88rem',
                  lineHeight: 1.6,
                }}>
                  <strong style={{ display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                    Security Office Notes:
                  </strong>
                  {claim.decisionNotes}
                </div>
              )}

              <ClaimTimeline status={claim.status} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
