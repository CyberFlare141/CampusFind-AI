import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getPendingClaims,
  getOfficerDecisions,
  decideClaim,
  confirmHandoverQr,
  getClaimReview,
  getOfficerVerificationReview,
} from '../../api/claims';
import { approveOwnershipReview, rejectOwnershipReview } from '../../api/securityOwnershipVerifications';
import {
  Alert,
  ButtonSpinner,
  EmptyState,
  PageLoading,
  StatusBadge,
  formatDate,
  FadeImage,
} from '../../components/Ui';
import { publicAssetUrl } from '../../api/client';

export default function SecurityClaimsPage() {
  const [tab, setTab] = useState('pending'); // 'pending' | 'decisions'
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadClaims(currentTab) {
    setLoading(true);
    setError('');
    try {
      const data = currentTab === 'pending'
        ? await getPendingClaims()
        : await getOfficerDecisions();
      
      // Deduplicate by ID to guarantee zero duplicate rows
      const items = Array.isArray(data) ? data : [];
      const uniqueMap = new Map();
      items.forEach(c => {
        if (c && c.id && !uniqueMap.has(c.id)) {
          uniqueMap.set(c.id, c);
        }
      });
      setClaims(Array.from(uniqueMap.values()));
    } catch (err) {
      setError(err.message || 'Failed to load claims.');
      setClaims([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClaims(tab);
  }, [tab]);

  function handleDecided(updatedClaim) {
    if (tab === 'pending') {
      // Immediately remove decided claim from pending queue
      setClaims(prev => prev.filter(c => c.id !== updatedClaim.id));
    } else {
      setClaims(prev => prev.map(c => (c.id === updatedClaim.id ? updatedClaim : c)));
    }
  }

  return (
    <div className="page-container-wide security-claims-page">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div>
          <span className="eyebrow">Security Desk Operations</span>
          <h1>Claims Review &amp; Decisions</h1>
          <p className="text-secondary">
            Evaluate ownership claims, review evidence, and record official approval or rejection decisions.
          </p>
        </div>
      </motion.div>

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        <button
          type="button"
          className={`tab-btn ${tab === 'pending' ? 'active' : ''}`}
          onClick={() => setTab('pending')}
        >
          Pending Reviews {tab === 'pending' && !loading ? `(${claims.length})` : ''}
        </button>
        <button
          type="button"
          className={`tab-btn ${tab === 'decisions' ? 'active' : ''}`}
          onClick={() => setTab('decisions')}
        >
          My Decision History {tab === 'decisions' && !loading ? `(${claims.length})` : ''}
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 16 }}>
          <Alert type="error">{error}</Alert>
        </div>
      )}

      {loading ? (
        <PageLoading label={tab === 'pending' ? 'Loading pending claims…' : 'Loading your decision history…'} />
      ) : claims.length === 0 ? (
        <EmptyState
          svgIcon={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: 32, height: 32 }}
            >
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          }
          title={tab === 'pending' ? 'All claims reviewed' : 'No decisions on record'}
          message={
            tab === 'pending'
              ? 'The pending review queue is completely clear. No action needed right now.'
              : 'Claims you review and decide on will appear here in your decision log.'
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {claims.map((claim, i) => (
            <motion.div
              key={claim.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.3 }}
            >
              <ClaimReviewRow
                claim={claim}
                isPendingTab={tab === 'pending'}
                onDecided={handleDecided}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function ClaimReviewRow({ claim, isPendingTab, onDecided }) {
  const [showDecisionForm, setShowDecisionForm] = useState(false);
  const [decisionAction, setDecisionAction] = useState(null); // 'approve' | 'reject'
  const [decisionNotes, setDecisionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rowError, setRowError] = useState('');

  const [review, setReview] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const [showHandover, setShowHandover] = useState(false);
  const [scannedToken, setScannedToken] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [handoverSuccess, setHandoverSuccess] = useState('');

  const isConflictClaim = Boolean(
    claim.isItemAlreadyClaimed ||
    claim.foundItemStatus === 'Claimed' ||
    claim.foundItemStatus === 'Returned'
  );

  function startDecision(action) {
    setDecisionAction(action);
    setShowDecisionForm(true);
    setRowError('');
  }

  async function submitDecision(e) {
    e.preventDefault();
    if (claim.verificationMatchId && !review?.ownershipVerification?.verificationId) {
      setRowError('Open the ownership evidence comparison before recording a decision.');
      return;
    }
    setSubmitting(true);
    setRowError('');
    try {
      if (claim.verificationMatchId) {
        const updated = decisionAction === 'approve'
          ? await approveOwnershipReview(review.ownershipVerification.verificationId, decisionNotes.trim() || undefined)
          : await rejectOwnershipReview(review.ownershipVerification.verificationId, decisionNotes.trim() || undefined);
        onDecided({ ...claim, verificationStatus: updated.status });
      } else {
        onDecided(await decideClaim(claim.id, { approve: decisionAction === 'approve', decisionNotes: decisionNotes.trim() || undefined }));
      }
      setShowDecisionForm(false);
    } catch (err) {
      setRowError(err.message || 'Failed to submit decision.');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleReview() {
    if (review) {
      setReviewOpen(o => !o);
      return;
    }
    setReviewLoading(true);
    setRowError('');
    try {
      const [claimReview, verificationReview] = await Promise.all([getClaimReview(claim.id), getOfficerVerificationReview(claim.id)]);
      setReview({ ...claimReview, ownershipVerification: verificationReview });
      setReviewOpen(true);
    } catch (err) {
      setRowError(err.message || 'Failed to load claim evidence.');
    } finally {
      setReviewLoading(false);
    }
  }

  async function submitHandover(e) {
    e.preventDefault();
    setSubmitting(true);
    setRowError('');
    try {
      const result = await confirmHandoverQr(claim.id, {
        token: scannedToken.trim(),
        handoverNotes: handoverNotes.trim() || undefined,
      });
      onDecided(result.claim);
      setHandoverSuccess(
        result.closedLostReportsCount > 0
          ? `Handover recorded successfully! ${result.closedLostReportsCount} matching lost report${result.closedLostReportsCount === 1 ? '' : 's'} closed.`
          : 'Handover recorded successfully! The found item is now marked as returned.'
      );
      setShowHandover(false);
    } catch (err) {
      setRowError(err.message || 'Handover confirmation failed.');
    } finally {
      setSubmitting(false);
    }
  }

  const primaryImage = claim.imageUrls && claim.imageUrls.length > 0 ? claim.imageUrls[0] : null;

  return (
    <div className="card card-pad-lg security-claim-card" style={{ position: 'relative' }}>
      {/* ── Claim Header & Primary Details ─────────────────────── */}
      <div className="security-claim-header" style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 14 }}>
        <div className="security-claim-summary" style={{ display: 'flex', gap: 14, alignItems: 'center', flex: 1, minWidth: 0 }}>
          {primaryImage && (
            <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border)' }}>
              <FadeImage src={publicAssetUrl(primaryImage)} alt={claim.foundItemTitle} />
            </div>
          )}
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 4px 0' }}>
              {claim.foundItemTitle}
            </h3>
            <p className="text-sm text-secondary" style={{ margin: 0 }}>
              Claimant: <strong style={{ color: 'var(--text-primary)' }}>{claim.claimantEmail}</strong>
              {' · '}
              Filed {formatDate(claim.createdAt)}
            </p>
          </div>
        </div>
        <StatusBadge status={claim.status} />
      </div>

      {/* ── Conflict / Item Already Claimed Notice ─────────────── */}
      {isPendingTab && isConflictClaim && (
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(234, 179, 8, 0.12)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(234, 179, 8, 0.4)',
            color: '#854d0e',
            marginBottom: 14,
            fontSize: '0.88rem',
            lineHeight: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>⚠️</span>
          <div>
            <strong>Item already claimed or returned:</strong> Another claim for this found item has already been approved or completed. This claim cannot be approved.
          </div>
        </div>
      )}

      {/* ── Claimant Proof of Ownership Notes ──────────────────── */}
      {claim.claimantNotes && (
        <div
          style={{
            padding: '12px 16px',
            background: 'var(--surface-card-alt)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 14,
            fontSize: '0.9rem',
            lineHeight: 1.6,
            border: '1px solid var(--border)',
          }}
        >
          <strong
            style={{
              display: 'block',
              marginBottom: 4,
              fontSize: '0.72rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-secondary)',
            }}
          >
            Claimant Proof of Ownership / Description:
          </strong>
          {claim.claimantNotes}
        </div>
      )}

      {/* ── Decision History Details (For Decided Claims) ────────── */}
      {!isPendingTab && (
        <div style={{ marginBottom: 14 }}>
          {claim.status === 'Rejected' && (
            <div
              style={{
                padding: '12px 16px',
                background: 'rgba(239, 68, 68, 0.08)',
                borderLeft: '4px solid var(--danger, #ef4444)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--danger, #ef4444)',
                fontSize: '0.9rem',
                lineHeight: 1.5,
                marginBottom: 8,
              }}
            >
              <strong style={{ display: 'block', marginBottom: 2 }}>Reason for Rejection:</strong>
              {claim.decisionNotes || 'No specific rejection reason provided.'}
            </div>
          )}

          {claim.status === 'Approved' && (
            <div
              style={{
                padding: '12px 16px',
                background: 'rgba(34, 197, 94, 0.08)',
                borderLeft: '4px solid var(--success, #22c55e)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                lineHeight: 1.5,
                marginBottom: 8,
              }}
            >
              <strong style={{ display: 'block', marginBottom: 2, color: 'var(--success, #22c55e)' }}>
                ✓ Claim Approved for Handover
              </strong>
              {claim.decisionNotes && <span>Approval Notes: {claim.decisionNotes}</span>}
            </div>
          )}

          {claim.status === 'Returned' && (
            <div
              style={{
                padding: '12px 16px',
                background: 'rgba(59, 130, 246, 0.08)',
                borderLeft: '4px solid var(--info, #3b82f6)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                lineHeight: 1.5,
                marginBottom: 8,
              }}
            >
              <strong style={{ display: 'block', marginBottom: 2, color: 'var(--info, #3b82f6)' }}>
                ✓ Handover Completed
              </strong>
              {claim.handedOverAt && <div>Returned on {formatDate(claim.handedOverAt)}</div>}
              {claim.handoverNotes && <div>Notes: {claim.handoverNotes}</div>}
            </div>
          )}

          {claim.reviewedAt && (
            <p className="text-xs text-muted" style={{ margin: '4px 0 0' }}>
              Decision recorded on {formatDate(claim.reviewedAt)}
              {claim.reviewedByEmail ? ` by ${claim.reviewedByEmail}` : ''}
            </p>
          )}
        </div>
      )}

      {rowError && (
        <div style={{ marginBottom: 12 }}>
          <Alert type="error">{rowError}</Alert>
        </div>
      )}
      {handoverSuccess && (
        <div style={{ marginBottom: 12 }}>
          <Alert type="success">{handoverSuccess}</Alert>
        </div>
      )}

      {/* ── Evidence Drawer ──────────────────────────────────── */}
      <AnimatePresence>
        {reviewOpen && review && (
          <ClaimEvidence review={review} />
        )}
      </AnimatePresence>

      {/* ── Decision Form (Approve / Reject) ──────────────────── */}
      <AnimatePresence>
        {showDecisionForm && (
          <motion.form
            onSubmit={submitDecision}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: '1px solid var(--border)',
              display: 'grid',
              gap: 14,
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                background: decisionAction === 'approve' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                borderRadius: 'var(--radius-md)',
                borderLeft: `4px solid ${decisionAction === 'approve' ? 'var(--success, #22c55e)' : 'var(--danger, #ef4444)'}`,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: decisionAction === 'approve' ? 'var(--success, #22c55e)' : 'var(--danger, #ef4444)',
                }}
              >
                {decisionAction === 'approve'
                  ? '✓ You are approving this ownership claim. The claimant will receive a Handover QR code.'
                  : '✗ You are rejecting this ownership claim.'}
              </p>
            </div>

            <div className="form-field">
              <label htmlFor={`notes-${claim.id}`}>
                {decisionAction === 'approve'
                  ? 'Approval notes / pickup instructions (optional)'
                  : 'Reason for rejection (will be shown to claimant & logged)'}
              </label>
              <textarea
                id={`notes-${claim.id}`}
                rows={2}
                value={decisionNotes}
                onChange={e => setDecisionNotes(e.target.value)}
                placeholder={
                  decisionAction === 'approve'
                    ? 'Add any pickup instructions or verification notes…'
                    : 'Provide the specific reason for rejecting this claim…'
                }
                required={decisionAction === 'reject'}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <motion.button
                type="submit"
                className={`btn btn-sm ${decisionAction === 'approve' ? 'btn-primary' : 'btn-danger'}`}
                disabled={submitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                {submitting && <ButtonSpinner />}
                Confirm {decisionAction === 'approve' ? 'Approval' : 'Rejection'}
              </motion.button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowDecisionForm(false)}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* ── Handover QR Scanner Form ─────────────────────────── */}
      <AnimatePresence>
        {showHandover && (
          <motion.form
            onSubmit={submitHandover}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              marginTop: 16,
              padding: 16,
              borderRadius: 'var(--radius-md)',
              background: 'rgba(34, 197, 94, 0.08)',
              border: '1px solid var(--success, #22c55e)',
            }}
          >
            <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 700 }}>
              Scan Student Handover QR
            </h4>
            <p className="text-sm text-secondary" style={{ margin: '0 0 12px 0' }}>
              Scan the student&apos;s QR code with your Security scanner or paste their 64-character handover token. Confirm only when the physical item is returned.
            </p>
            <div className="form-field" style={{ marginBottom: 10 }}>
              <label htmlFor={`handover-qr-${claim.id}`}>QR Token / Scanned Value</label>
              <input
                id={`handover-qr-${claim.id}`}
                autoFocus
                value={scannedToken}
                onChange={e => setScannedToken(e.target.value)}
                placeholder="Paste or scan QR token here"
                required
              />
            </div>
            <div className="form-field" style={{ marginBottom: 12 }}>
              <label htmlFor={`handover-notes-${claim.id}`}>Handover Notes (Optional)</label>
              <textarea
                id={`handover-notes-${claim.id}`}
                rows={2}
                value={handoverNotes}
                onChange={e => setHandoverNotes(e.target.value)}
                placeholder="e.g. Student ID verified in person at Central Security Desk"
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <motion.button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={submitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                {submitting && <ButtonSpinner />}
                Confirm QR &amp; Complete Handover
              </motion.button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowHandover(false)}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* ── Action Buttons Bar ───────────────────────────────── */}
      <div className="security-claim-actions"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginTop: 14,
          paddingTop: 14,
          borderTop: '1px solid var(--border)',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={toggleReview}
          disabled={reviewLoading}
        >
          {reviewLoading ? 'Loading evidence…' : reviewOpen ? 'Hide Evidence Comparison' : 'View Full Evidence'}
        </button>

        {isPendingTab && claim.status === 'Pending' && !showDecisionForm && (
          <>
            {!isConflictClaim ? (
              <motion.button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => startDecision('approve')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                ✓ Approve Claim
              </motion.button>
            ) : (
              <span
                className="badge badge-muted"
                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                title="Another claim for this item has already been approved."
              >
                Approval Disabled (Item Claimed)
              </span>
            )}
            <motion.button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => startDecision('reject')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              ✗ Reject Claim
            </motion.button>
          </>
        )}

        {!isPendingTab && claim.status === 'Approved' && !showHandover && (
          <motion.button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              setShowHandover(true);
              setHandoverSuccess('');
              setScannedToken('');
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            Scan Student QR / Confirm Handover
          </motion.button>
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
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        marginTop: 16,
        paddingTop: 16,
        borderTop: '1px solid var(--border)',
      }}
    >
      <div className="security-evidence-people"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div>
          <span className="eyebrow">Verified Evidence Comparison</span>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
            Item &amp; Stakeholder Profiles
          </h3>
        </div>
        <StatusBadge status={review.status} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 16,
        }}
      >
        <EvidencePerson title="Claimant Profile" person={review.claimant} />
        <EvidencePerson title="Finder / Reporter Profile" person={review.reporter} />
      </div>

      {review.ownershipVerification?.questions?.length > 0 && (
        <section style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
          <div>
            <span className="eyebrow">Ownership verification</span>
            <h4 style={{ margin: '2px 0 0', fontSize: '1rem' }}>Founder and owner answer comparison</h4>
          </div>
          {review.ownershipVerification.questions.map((question, index) => (
            <article key={question.id} style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--surface-card-alt)' }}>
              <strong style={{ display: 'block', marginBottom: 12 }}>Question {index + 1}: {question.question}</strong>
              <div className="security-answer-comparison" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 12 }}>
                <div><span className="text-xs text-muted">Founder answer</span><p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{question.founderAnswer || 'Not available'}</p></div>
                <div><span className="text-xs text-muted">Owner answer</span><p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{question.ownerAnswer || 'Not available'}</p></div>
              </div>
            </article>
          ))}
        </section>
      )}

      <div
        style={{
          padding: 16,
          background: 'var(--surface-card-alt)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
        }}
      >
        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 6px 0' }}>
          Found Item Reference
        </h4>
        <p style={{ fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
          {review.foundItemTitle}
        </p>
        <p className="text-secondary text-sm" style={{ margin: '0 0 8px 0' }}>
          {review.foundItemDescription || 'No description recorded.'}
        </p>
        {review.foundAt && (
          <p className="text-xs text-muted" style={{ margin: '0 0 4px 0' }}>
            <strong>Found date:</strong> {formatDate(review.foundAt)}
          </p>
        )}
        <p className="text-xs text-muted" style={{ margin: 0 }}>
          <strong>Claimant proof notes:</strong> {review.claimantNotes || 'None provided.'}
        </p>
        {review.imageUrls && review.imageUrls.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {review.imageUrls.map((url, i) => (
              <a key={url} href={publicAssetUrl(url)} target="_blank" rel="noreferrer">
                <img
                  src={publicAssetUrl(url)}
                  alt={`${review.foundItemTitle} evidence ${i + 1}`}
                  style={{
                    width: 72,
                    height: 72,
                    objectFit: 'cover',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                  }}
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
    ['Full Name', person?.fullName],
    ['Email', person?.email],
    ['Department', person?.department],
    ['Job Title', person?.jobTitle],
    ['Semester', person?.semester],
    ['Student ID', person?.studentId],
    ['Phone', person?.phone],
  ].filter(([, value]) => Boolean(value));

  return (
    <section
      style={{
        padding: 14,
        background: 'var(--surface-card-alt)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
      }}
    >
      <h4
        style={{
          fontSize: '0.78rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--text-secondary)',
          margin: '0 0 10px 0',
          fontFamily: 'var(--font-display)',
        }}
      >
        {title}
      </h4>
      {fields.length > 0 ? (
        <dl style={{ display: 'grid', gap: 6, margin: 0 }}>
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  color: 'var(--text-muted)',
                  margin: '0 0 1px 0',
                }}
              >
                {label}
              </dt>
              <dd
                style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-muted text-sm" style={{ margin: 0 }}>
          No profile details available.
        </p>
      )}
    </section>
  );
}
