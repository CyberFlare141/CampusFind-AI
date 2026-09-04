import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getMyClaims } from '../../api/claims';
import { getAllFoundItems } from '../../api/foundItems';
import { Alert, EmptyState, PageLoading, SkeletonGrid, ItemCard, StatusBadge, formatDate } from '../../components/Ui';
import VerificationModal from '../../components/VerificationModal';

const STATUS_STEPS = ['Submitted', 'Verification', 'Approved', 'Handover'];

function ClaimTimeline({ status, verificationStatus }) {
  const isRejected = status === 'Rejected';
  let currentStep = 0;
  if (verificationStatus === 'Completed') currentStep = 1;
  if (status === 'Approved') currentStep = 2;
  if (status === 'Handover' || status === 'Returned') currentStep = 3;

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
  const [activeVerificationClaim, setActiveVerificationClaim] = useState(null);
  const [foundCatalog, setFoundCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  async function loadClaims() {
    setLoading(true);
    setError('');
    try {
      const data = await getMyClaims();
      setClaims(data);
      if (data.length === 0) {
        setCatalogLoading(true);
        getAllFoundItems()
          .then(items => setFoundCatalog(items))
          .catch(() => {})
          .finally(() => setCatalogLoading(false));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClaims();
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
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link
            to="/found-items"
            className="btn btn-primary btn-md"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: 'var(--shadow-xs)',
              fontWeight: 700,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            + Claim a Found Item
          </Link>
          <Link to="/found-items" className="btn btn-secondary btn-sm">
            Browse Catalog <span className="btn-arrow">→</span>
          </Link>
        </div>
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
        <div>
          <EmptyState
            svgIcon={(
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 34, height: 34, color: 'var(--primary)' }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            )}
            title="No active claims filed yet"
            message="To claim a lost belonging, find your item in the campus catalog below, click 'Claim Item', and answer the AI ownership questions for Security Review."
            action={(
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Link to="/found-items" className="btn btn-primary btn-lg">
                  ⚖️ Browse All Found Items <span className="btn-arrow">→</span>
                </Link>
                <Link to="/search" className="btn btn-secondary btn-lg">
                  🔍 AI Semantic Search
                </Link>
              </div>
            )}
          />

          {/* Quick Claim Catalog Section */}
          <div style={{ marginTop: 40, borderTop: '1px solid var(--border)', paddingTop: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <span className="eyebrow" style={{ color: 'var(--primary-deep)', fontWeight: 800 }}>Campus Catalog</span>
                <h3 style={{ fontSize: '1.25rem', margin: '2px 0 4px', fontFamily: 'var(--font-display)' }}>
                  Recent Campus Found Items — Ready to Claim
                </h3>
                <p className="text-xs text-muted">
                  Click <strong>"Claim Item →"</strong> on any item you recognize to start your ownership verification claim.
                </p>
              </div>
              <Link to="/found-items" className="btn btn-secondary btn-sm" style={{ fontWeight: 600 }}>
                View Full Catalog ({foundCatalog.length}) →
              </Link>
            </div>

            {catalogLoading ? (
              <SkeletonGrid count={3} />
            ) : foundCatalog.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border)' }}>
                <p className="text-sm text-muted">No items currently reported in the found catalog.</p>
                <Link to="/lost-items/new" className="btn btn-primary btn-sm" style={{ marginTop: 10 }}>
                  Report a Lost Item Instead →
                </Link>
              </div>
            ) : (
              <div className="item-grid">
                {foundCatalog.slice(0, 6).map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.25), duration: 0.3 }}
                  >
                    <ItemCard item={item} type="found" isMine={false} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
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

              {/* ── Ownership Verification Status / Prompt ──────── */}
              {claim.status === 'Pending' && (
                claim.verificationStatus === 'Completed' ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'var(--verify-surface, #C7EABB)',
                    color: '#2d5a27',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    marginBottom: 14,
                    border: '1px solid #84B179',
                  }}>
                    <span>✓</span> AI Ownership Verification Submitted — Campus Security is reviewing your answers.
                  </div>
                ) : claim.verificationStatus === 'Locked' ? (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'var(--danger-bg)',
                    color: 'var(--danger)',
                    fontSize: '0.86rem',
                    fontWeight: 600,
                    marginBottom: 14,
                  }}>
                    ⚠️ Maximum verification attempts reached. Please visit the Campus Security Desk for manual verification.
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'var(--verify-bg, #E8F5BD)',
                    border: '1.5px solid var(--verify-primary, #84B179)',
                    marginBottom: 14,
                    flexWrap: 'wrap',
                    gap: 10,
                  }}>
                    <div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1F2937' }}>
                        🛡️ AI Ownership Verification
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#4B5563' }}>
                        Answer 3 brief questions about distinctive details to expedite verification.
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => setActiveVerificationClaim(claim)}
                      style={{
                        background: 'var(--verify-primary, #84B179)',
                        borderColor: 'var(--verify-primary, #84B179)',
                        color: '#1F2937',
                        fontWeight: 700,
                      }}
                    >
                      Answer Questions →
                    </button>
                  </div>
                )
              )}

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

              <ClaimTimeline status={claim.status} verificationStatus={claim.verificationStatus} />
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Ownership Verification Modal ────────────────────── */}
      <VerificationModal
        claim={activeVerificationClaim}
        isOpen={Boolean(activeVerificationClaim)}
        onClose={() => setActiveVerificationClaim(null)}
        onComplete={() => {
          loadClaims();
        }}
      />
    </div>
  );
}
