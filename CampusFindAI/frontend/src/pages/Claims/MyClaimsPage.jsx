import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getMyClaims } from '../../api/claims';
import { Alert, EmptyState, PageLoading, StatusBadge, formatDate } from '../../components/Ui';

const STATUS_STEPS = ['Pending', 'Verification', 'Approved', 'Handover'];

function ClaimTimeline({ status }) {
  const currentStep = STATUS_STEPS.indexOf(status);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 12 }}>
      {STATUS_STEPS.map((step, i) => (
        <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < STATUS_STEPS.length - 1 ? 1 : 0 }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            background: i <= currentStep ? 'var(--primary)' : 'var(--surface-hover)',
            border: `2px solid ${i <= currentStep ? 'var(--primary)' : 'var(--border)'}`,
            display: 'grid', placeItems: 'center',
            fontSize: '0.7rem', fontWeight: 700, color: i <= currentStep ? 'white' : 'var(--text-muted)',
            flexShrink: 0,
            transition: 'all var(--transition-base)',
          }}>
            {i < currentStep ? '✓' : i + 1}
          </div>
          <div style={{ fontSize: '0.62rem', fontWeight: 600, color: i <= currentStep ? 'var(--primary-deep)' : 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: 4, marginRight: 8 }}>
            {step}
          </div>
          {i < STATUS_STEPS.length - 1 && (
            <div style={{ flex: 1, height: 2, background: i < currentStep ? 'var(--primary)' : 'var(--border)', marginRight: 4, transition: 'background var(--transition-base)' }} />
          )}
        </div>
      ))}
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
    <div className="page-container page-container-narrow">
      <motion.div className="page-header" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
        <div>
          <span className="eyebrow">Claims</span>
          <h1>My Claims</h1>
          <p className="text-secondary">Track the status of your ownership claims.</p>
        </div>
      </motion.div>

      <Alert type="error">{error}</Alert>

      {loading ? (
        <PageLoading label="Loading your claims…" />
      ) : claims.length === 0 ? (
        <EmptyState
          svgIcon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>}
          title="No claims yet"
          message="When you claim a found item, it will appear here with its current status."
          action={<Link to="/found-items" className="btn btn-primary btn-sm">Browse Found Items</Link>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {claims.map((claim, i) => (
            <motion.div
              key={claim.id}
              className="card card-pad"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                <div>
                  <Link to={`/found-items/${claim.foundItemId}`} className="font-bold" style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                    {claim.foundItemTitle}
                  </Link>
                  <p className="text-xs text-muted" style={{ marginTop: 4 }}>Filed {formatDate(claim.createdAt)}</p>
                </div>
                <StatusBadge status={claim.status} />
              </div>

              {claim.claimantNotes && (
                <p className="text-sm text-muted" style={{ marginBottom: 8, padding: '8px 12px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', lineHeight: 1.6 }}>
                  <strong>Your notes:</strong> {claim.claimantNotes}
                </p>
              )}

              {claim.decisionNotes && (
                <p className="text-sm" style={{ marginBottom: 8, padding: '8px 12px', background: claim.status === 'Approved' ? 'var(--success-bg)' : 'var(--danger-bg)', borderRadius: 'var(--radius-sm)', color: claim.status === 'Approved' ? 'var(--success)' : 'var(--danger)', lineHeight: 1.6 }}>
                  <strong>Security Office:</strong> {claim.decisionNotes}
                </p>
              )}

              <ClaimTimeline status={claim.status} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
