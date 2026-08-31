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
    <div className="page-container">
      <motion.div className="page-header" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
        <div>
          <span className="eyebrow">🛡️ Security Office</span>
          <h1>Claims Review</h1>
          <p className="text-secondary">Approve or reject ownership claims filed against found items.</p>
        </div>
      </motion.div>

      <div className="tabs">
        <button type="button" className={`tab-btn ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>⏳ Pending Queue</button>
        <button type="button" className={`tab-btn ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>📋 Full History</button>
      </div>

      <Alert type="error">{error}</Alert>

      {loading ? (
        <PageLoading />
      ) : claims.length === 0 ? (
        <EmptyState
          icon={tab === 'pending' ? '✅' : '⚖️'}
          title={tab === 'pending' ? 'No pending claims' : 'No claims yet'}
          message={tab === 'pending' ? "You're all caught up — no claims awaiting review." : 'Claims will show up here once students file them.'}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {claims.map((claim, i) => (
            <motion.div
              key={claim.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.35 }}
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
    <div className="card card-pad">
      {/* ── Claim header ────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: '1rem', marginBottom: 4 }}>{claim.foundItemTitle}</h3>
          <p className="text-sm text-muted">
            Claimed by <strong>{claim.claimantEmail}</strong> · Filed {formatDate(claim.createdAt)}
          </p>
        </div>
        <StatusBadge status={claim.status} />
      </div>

      {claim.claimantNotes && (
        <div style={{ padding: '10px 14px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', marginBottom: 12, fontSize: '0.875rem', lineHeight: 1.6 }}>
          <strong style={{ display: 'block', marginBottom: 2, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>Proof of ownership</strong>
          {claim.claimantNotes}
        </div>
      )}
      {claim.decisionNotes && (
        <div style={{ padding: '10px 14px', background: claim.status === 'Approved' ? 'var(--success-bg)' : 'var(--danger-bg)', borderRadius: 'var(--radius-md)', marginBottom: 12, fontSize: '0.875rem', color: claim.status === 'Approved' ? 'var(--success)' : 'var(--danger)', lineHeight: 1.6 }}>
          <strong>Decision notes:</strong> {claim.decisionNotes}
        </div>
      )}
      {claim.reviewedByEmail && (
        <p className="text-xs text-muted" style={{ marginBottom: 12 }}>Reviewed by {claim.reviewedByEmail} on {formatDate(claim.reviewedAt)}</p>
      )}

      <Alert type="error">{rowError}</Alert>

      {/* ── Review details ───────────────────────────────────── */}
      {reviewOpen && review && <ClaimEvidence review={review} />}

      {/* ── Decision form ────────────────────────────────────── */}
      {showForm && (
        <motion.form
          onSubmit={submitDecision}
          className="decision-form"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          <div style={{ padding: '12px 16px', background: pendingAction === 'approve' ? 'var(--success-bg)' : 'var(--danger-bg)', borderRadius: 'var(--radius-md)', borderLeft: `3px solid ${pendingAction === 'approve' ? 'var(--success)' : 'var(--danger)'}` }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: pendingAction === 'approve' ? 'var(--success)' : 'var(--danger)' }}>
              {pendingAction === 'approve' ? '✓ You are about to approve this claim.' : '✗ You are about to reject this claim.'}
            </p>
          </div>
          <div className="form-field">
            <label htmlFor={`notes-${claim.id}`}>
              {pendingAction === 'approve' ? 'Approval notes (optional)' : 'Reason for rejection (optional)'}
            </label>
            <textarea id={`notes-${claim.id}`} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any notes for the record…" />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <motion.button type="submit" className={`btn btn-sm ${pendingAction === 'approve' ? 'btn-primary' : 'btn-danger'}`} disabled={submitting} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              {submitting && <ButtonSpinner />} Confirm {pendingAction === 'approve' ? 'Approval' : 'Rejection'}
            </motion.button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)} disabled={submitting}>Cancel</button>
          </div>
        </motion.form>
      )}

      {/* ── Action buttons ───────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={openReview} disabled={reviewLoading}>
          {reviewLoading ? 'Loading…' : reviewOpen ? 'Hide details' : 'View full review'}
        </button>
        {reviewable && !showForm && (
          <>
            <motion.button type="button" className="btn btn-primary btn-sm" onClick={() => startDecision('approve')} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>✓ Approve</motion.button>
            <motion.button type="button" className="btn btn-danger btn-sm" onClick={() => startDecision('reject')} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>✗ Reject</motion.button>
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
    >
      <div className="claim-evidence-heading">
        <div><span className="eyebrow">Review evidence</span><h3 style={{ margin: 0, fontSize: '1rem' }}>Item and people details</h3></div>
        <StatusBadge status={review.status} />
      </div>
      <div className="claim-evidence-grid">
        <EvidencePerson title="Claimant" person={review.claimant} />
        <EvidencePerson title="Reporter" person={review.reporter} />
      </div>
      <div className="claim-item-evidence">
        <h4 style={{ fontSize: '0.85rem', marginBottom: 8 }}>Found item report</h4>
        <p><strong>{review.foundItemTitle}</strong></p>
        <p className="text-muted text-sm">{review.foundItemDescription || 'No public description was provided.'}</p>
        <p className="text-sm"><strong>Reported found:</strong> {formatDate(review.foundAt)}</p>
        <p className="text-sm"><strong>Claimant's ownership proof:</strong> {review.claimantNotes || 'No proof notes were supplied.'}</p>
        {review.imageUrls?.length > 0 ? (
          <div className="review-image-grid">
            {review.imageUrls.map((url, i) => (
              <a key={url} href={publicAssetUrl(url)} target="_blank" rel="noreferrer">
                <img src={publicAssetUrl(url)} alt={`${review.foundItemTitle} evidence photo ${i + 1}`} />
              </a>
            ))}
          </div>
        ) : <p className="text-muted text-sm">No photos were attached to this report.</p>}
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
    <section className="claim-person-card">
      <h4>{title}</h4>
      {fields.length ? (
        <dl style={{ display: 'grid', gap: 6, margin: 0 }}>
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 1 }}>{label}</dt>
              <dd style={{ margin: 0, fontSize: '0.875rem' }}>{value}</dd>
            </div>
          ))}
        </dl>
      ) : <p className="text-muted text-sm">No profile information available.</p>}
    </section>
  );
}
