import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getPendingClaims, getAllClaims, decideClaim, getClaimReview, getOfficerVerificationReview } from '../../api/claims';
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

      {/* ── Ownership Verification Panel ─────────────────────── */}
      <OfficerVerificationPanel
        claim={claim}
        reviewable={reviewable && !showForm}
        onApprove={() => startDecision('approve')}
        onReject={() => startDecision('reject')}
      />

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

function OfficerVerificationPanel({ claim, onApprove, onReject, reviewable }) {
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openBreakdown, setOpenBreakdown] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const data = await getOfficerVerificationReview(claim.id);
        if (active) setReview(data);
      } catch {
        // Handled gracefully
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [claim.id]);

  if (loading) {
    return (
      <div style={{ padding: '12px 16px', borderRadius: '12px', background: 'var(--surface-card-alt)', marginBottom: 14, fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
        Loading AI ownership verification…
      </div>
    );
  }

  if (!review || review.questions.length === 0) {
    return (
      <div style={{
        padding: '12px 16px',
        borderRadius: '12px',
        background: 'var(--surface-card-alt)',
        border: '1px solid var(--border)',
        marginBottom: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <div>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
            Ownership Verification
          </span>
          <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Status: <strong>{claim.verificationStatus || 'Not Started'}</strong>
          </div>
        </div>
        <span className="badge badge-muted">No AI Questions Generated</span>
      </div>
    );
  }

  const claimNumber = review.claimNumber || `CF-${claim.id.slice(0, 6).toUpperCase()}`;
  const studentName = review.studentName || claim.claimantEmail;

  return (
    <div
      style={{
        padding: '20px',
        borderRadius: '14px',
        background: 'var(--verify-bg, #E8F5BD)',
        border: '1.5px solid var(--verify-primary, #84B179)',
        marginBottom: 16,
        color: 'var(--verify-text, #1F2937)',
      }}
    >
      {/* ── Panel Header ─────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <div>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#2d5a27' }}>
            Ownership Verification
          </span>
          <h4 style={{ margin: '3px 0 4px', fontSize: '1.15rem', fontWeight: 800, color: '#1F2937' }}>
            Claim #{claimNumber}
          </h4>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#374151' }}>
            Student: <strong style={{ color: '#1F2937' }}>{studentName}</strong>
          </p>
        </div>

        <div
          style={{
            background: 'var(--verify-surface, #C7EABB)',
            padding: '10px 16px',
            borderRadius: '10px',
            border: '1px solid rgba(132, 177, 121, 0.45)',
            textAlign: 'right',
          }}
        >
          <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#2d5a27' }}>
            Verification Result
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1F2937', marginTop: 1 }}>
            {review.matchedCount} / {review.totalQuestions} answers matched
          </div>
          <div style={{ fontSize: '0.82rem', color: '#374151', marginTop: 2 }}>
            Confidence: <strong style={{ color: review.confidenceScore >= 70 ? '#2d5a27' : '#991B1B' }}>{Math.round(review.confidenceScore)}%</strong>
          </div>
        </div>
      </div>

      {/* ── Breakdown Toggle ──────────────────────────── */}
      <div style={{ marginBottom: 12 }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setOpenBreakdown(o => !o)}
          style={{ padding: '4px 8px', fontSize: '0.82rem', fontWeight: 600, color: '#2d5a27' }}
        >
          {openBreakdown ? '▲ Hide AI Evaluation Breakdown' : '▼ Inspect Question-by-Question Answers'}
        </button>
      </div>

      {/* ── Detailed Question Breakdown ──────────────── */}
      {openBreakdown && (
        <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
          {review.questions.map((q, idx) => (
            <div
              key={q.id || idx}
              style={{
                padding: '12px 14px',
                background: '#FFFFFF',
                borderRadius: '10px',
                border: `1px solid ${q.matched ? 'rgba(132, 177, 121, 0.7)' : 'rgba(239, 68, 68, 0.4)'}`,
                fontSize: '0.88rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                <div style={{ fontWeight: 700, color: '#1F2937' }}>
                  Q{idx + 1}: {q.question}
                </div>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    background: q.matched ? '#DCFCE7' : '#FEE2E2',
                    color: q.matched ? '#166534' : '#991B1B',
                  }}
                >
                  {q.matched ? '✓ Matched' : '✗ No Match'} ({Math.round(q.confidence * 100)}%)
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#4B5563', marginBottom: 2 }}>
                <strong>Student Answer:</strong> {q.studentAnswer ? `"${q.studentAnswer}"` : <span style={{ color: '#9CA3AF' }}>(No answer provided)</span>}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#2d5a27', marginBottom: 2 }}>
                <strong>Expected Detail (Officer Only):</strong> "{q.expectedAnswer}"
              </div>
              {q.reasoning && (
                <div style={{ fontSize: '0.78rem', color: '#6B7280', fontStyle: 'italic', marginTop: 4 }}>
                  AI Analysis: {q.reasoning}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Quick Officer Decisions ──────────────────── */}
      {reviewable && (
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            paddingTop: 12,
            borderTop: '1px solid rgba(132, 177, 121, 0.4)',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={onApprove}
            style={{
              background: 'var(--verify-primary, #84B179)',
              borderColor: 'var(--verify-primary, #84B179)',
              color: '#1F2937',
              fontWeight: 700,
            }}
          >
            ✓ Approve Claim
          </button>
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={onReject}
          >
            ✗ Reject Claim
          </button>
          <span style={{ fontSize: '0.76rem', color: '#4B5563', marginLeft: 'auto' }}>
            Officer remains the final authority
          </span>
        </div>
      )}
    </div>
  );
}
