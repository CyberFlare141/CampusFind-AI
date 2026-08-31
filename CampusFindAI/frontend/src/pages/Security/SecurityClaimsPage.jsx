import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getPendingClaims, getAllClaims, decideClaim, getClaimReview } from '../../api/claims';
import { Alert, ButtonSpinner, EmptyState, PageLoading, StatusBadge, formatDate } from '../../components/Ui';
import { publicAssetUrl } from '../../api/client';

export default function SecurityClaimsPage() {
  const [tab, setTab] = useState('pending');
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadClaims(currentTab) {
    setLoading(true);
    setError('');
    try {
      const data = currentTab === 'pending' ? await getPendingClaims() : await getAllClaims();
      setClaims(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadClaims(tab); }, [tab]);

  function handleDecided(updatedClaim) {
    if (tab === 'pending') {
      setClaims(prev => prev.filter(c => c.id !== updatedClaim.id));
    } else {
      setClaims(prev => prev.map(c => c.id === updatedClaim.id ? updatedClaim : c));
    }
  }

  return (
    <div className="page-container-wide">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <motion.div className="page-header" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
        <div>
          <span className="eyebrow">Security Desk Operations</span>
          <h1>Claims Review Queue</h1>
          <p className="text-secondary">Review claimant ownership evidence, cross-reference item records, and approve or decline handovers.</p>
        </div>
      </motion.div>

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <div className="tabs">
        <button type="button" className={`tab-btn ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
          Pending Review ({tab === 'pending' ? claims.length : '…'})
        </button>
        <button type="button" className={`tab-btn ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>
          Decision History ({tab === 'all' ? claims.length : '…'})
        </button>
      </div>

      <Alert type="error">{error}</Alert>

      {loading ? (
        <PageLoading label="Loading claims queue…" />
      ) : claims.length === 0 ? (
        <EmptyState
          svgIcon={(
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 32, height: 32 }}>
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
          )}
          title={tab === 'pending' ? 'All claims reviewed' : 'No claims on record'}
          message={tab === 'pending' ? "The pending review queue is completely clear. No action needed right now." : 'Claims will populate here once filed by campus members.'}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {claims.map((claim, i) => (
            <motion.div
              key={claim.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.35 }}
            >
              <ClaimReviewRow
                claim={claim}
                reviewable={tab === 'pending' || claim.status === 'Pending'}
                onDecided={handleDecided}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function ClaimReviewRow({ claim, reviewable, onDecided }) {
  const [showForm, setShowForm] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rowError, setRowError] = useState('');
  const [review, setReview] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  function startDecision(action) { setPendingAction(action); setShowForm(true); setRowError(''); }

  async function submitDecision(e) {
    e.preventDefault();
    setSubmitting(true);
    setRowError('');
    try {
      const updated = await decideClaim(claim.id, { approve: pendingAction === 'approve', decisionNotes: notes.trim() || undefined });
      onDecided(updated);
      setShowForm(false);
    } catch (err) {
      setRowError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function openReview() {
    if (review) { setReviewOpen(o => !o); return; }
    setReviewLoading(true);
    setRowError('');
    try {
      const data = await getClaimReview(claim.id);
      setReview(data);
      setReviewOpen(true);
    } catch (err) {
      setRowError(err.message);
    } finally {
      setReviewLoading(false);
    }
  }

  return (
    <div className="card card-pad-lg">
      {/* ── Claim Header ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: 4 }}>{claim.foundItemTitle}</h3>
          <p className="text-sm text-muted">
            Claimant: <strong>{claim.claimantEmail}</strong> · Filed on {formatDate(claim.createdAt)}
          </p>
        </div>
        <StatusBadge status={claim.status} />
      </div>

      {claim.claimantNotes && (
        <div style={{ padding: '12px 16px', background: 'var(--surface-card-alt)', borderRadius: 'var(--radius-md)', marginBottom: 14, fontSize: '0.9rem', lineHeight: 1.6, border: '1px solid var(--border)' }}>
          <strong style={{ display: 'block', marginBottom: 3, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>
            Claimant Proof of Ownership:
          </strong>
          {claim.claimantNotes}
        </div>
      )}

      {claim.decisionNotes && (
        <div style={{
          padding: '12px 16px',
          background: claim.status === 'Approved' ? 'var(--success-bg)' : 'var(--danger-bg)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 14,
          fontSize: '0.9rem',
          color: claim.status === 'Approved' ? 'var(--success)' : 'var(--danger)',
          lineHeight: 1.6,
        }}>
          <strong>Officer Decision Notes:</strong> {claim.decisionNotes}
        </div>
      )}

      {claim.reviewedByEmail && (
        <p className="text-xs text-muted" style={{ marginBottom: 12 }}>
          Reviewed by {claim.reviewedByEmail} on {formatDate(claim.reviewedAt)}
        </p>
      )}

      <Alert type="error">{rowError}</Alert>

      {/* ── Evidence Drawer ──────────────────────────────────── */}
      {reviewOpen && review && <ClaimEvidence review={review} />}

      {/* ── Decision Form ────────────────────────────────────── */}
      {showForm && (
        <motion.form
          onSubmit={submitDecision}
          className="decision-form"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'grid', gap: 14 }}
        >
          <div style={{
            padding: '12px 16px',
            background: pendingAction === 'approve' ? 'var(--success-bg)' : 'var(--danger-bg)',
            borderRadius: 'var(--radius-md)',
            borderLeft: `4px solid ${pendingAction === 'approve' ? 'var(--success)' : 'var(--danger)'}`,
          }}>
            <p style={{ fontSize: '0.9rem', fontWeight: 700, color: pendingAction === 'approve' ? 'var(--success)' : 'var(--danger)' }}>
              {pendingAction === 'approve' ? '✓ You are approving this ownership claim for item return.' : '✗ You are declining this ownership claim.'}
            </p>
          </div>
          <div className="form-field">
            <label htmlFor={`notes-${claim.id}`}>
              {pendingAction === 'approve' ? 'Approval notes / pickup instructions (optional)' : 'Reason for rejection (optional)'}
            </label>
            <textarea id={`notes-${claim.id}`} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any notes for the audit log…" />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <motion.button type="submit" className={`btn btn-sm ${pendingAction === 'approve' ? 'btn-primary' : 'btn-danger'}`} disabled={submitting} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              {submitting && <ButtonSpinner />} Confirm {pendingAction === 'approve' ? 'Approval' : 'Rejection'}
            </motion.button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)} disabled={submitting}>Cancel</button>
          </div>
        </motion.form>
      )}

      {/* ── Action Buttons ───────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={openReview} disabled={reviewLoading}>
          {reviewLoading ? 'Loading…' : reviewOpen ? 'Hide full evidence' : 'View full evidence'}
        </button>
        {reviewable && !showForm && (
          <>
            <motion.button type="button" className="btn btn-primary btn-sm" onClick={() => startDecision('approve')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              ✓ Approve Claim
            </motion.button>
            <motion.button type="button" className="btn btn-danger btn-sm" onClick={() => startDecision('reject')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              ✗ Reject Claim
            </motion.button>
          </>
        )}
      </div>
    </div>
  );
}

function ClaimEvidence({ review }) {
  return (
    <motion.section
      className="claim-evidence"
      aria-label="Claim review evidence"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      transition={{ duration: 0.3 }}
      style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}
    >
      <div className="claim-evidence-heading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <span className="eyebrow">Verified Evidence</span>
          <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Item &amp; People Comparison</h3>
        </div>
        <StatusBadge status={review.status} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <EvidencePerson title="Claimant Profile" person={review.claimant} />
        <EvidencePerson title="Finder Profile" person={review.reporter} />
      </div>

      <div style={{ padding: '16px', background: 'var(--surface-card-alt)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <h4 style={{ fontSize: '0.9rem', marginBottom: 6 }}>Found Item Reference</h4>
        <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{review.foundItemTitle}</p>
        <p className="text-secondary text-sm" style={{ marginBottom: 8 }}>{review.foundItemDescription || 'No description recorded.'}</p>
        <p className="text-xs text-muted" style={{ marginBottom: 4 }}>
          <strong>Found date:</strong> {formatDate(review.foundAt)}
        </p>
        <p className="text-xs text-muted">
          <strong>Claimant proof notes:</strong> {review.claimantNotes || 'None'}
        </p>
        {review.imageUrls?.length > 0 && (
          <div className="review-image-grid" style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {review.imageUrls.map((url, i) => (
              <a key={url} href={publicAssetUrl(url)} target="_blank" rel="noreferrer">
                <img
                  src={publicAssetUrl(url)}
                  alt={`${review.foundItemTitle} evidence ${i + 1}`}
                  style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                />
              </a>
            ))}
          </div>
        )}
      </div>
    </motion.section>
  );
}

function EvidencePerson({ title, person }) {
  const fields = [
    ['Name', person?.fullName], ['Email', person?.email], ['Department', person?.department],
    ['Title', person?.jobTitle], ['Semester', person?.semester], ['Student ID', person?.studentId], ['Phone', person?.phone],
  ].filter(([, value]) => value);

  return (
    <section style={{ padding: 14, background: 'var(--surface-card-alt)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
      <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: 8, fontFamily: 'var(--font-display)' }}>
        {title}
      </h4>
      {fields.length ? (
        <dl style={{ display: 'grid', gap: 6, margin: 0 }}>
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 1 }}>{label}</dt>
              <dd style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{value}</dd>
            </div>
          ))}
        </dl>
      ) : <p className="text-muted text-sm">No profile data available.</p>}
    </section>
  );
}
