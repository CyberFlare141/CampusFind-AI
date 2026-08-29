import { useEffect, useState } from 'react';
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

  useEffect(() => {
    loadClaims(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  function handleDecided(updatedClaim) {
    if (tab === 'pending') {
      setClaims((prev) => prev.filter((c) => c.id !== updatedClaim.id));
    } else {
      setClaims((prev) => prev.map((c) => (c.id === updatedClaim.id ? updatedClaim : c)));
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <span className="eyebrow">Security Office</span>
          <h1>Claims Review</h1>
          <p>Approve or reject ownership claims filed against found items.</p>
        </div>
      </div>

      <div className="tabs">
        <button type="button" className={`tab-btn ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
          Pending Queue
        </button>
        <button type="button" className={`tab-btn ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>
          Full History
        </button>
      </div>

      <Alert type="error">{error}</Alert>

      {loading ? (
        <PageLoading />
      ) : claims.length === 0 ? (
        <EmptyState
          icon="\u2696\uFE0F"
          title={tab === 'pending' ? 'No pending claims' : 'No claims yet'}
          message={tab === 'pending' ? "You're all caught up." : 'Claims will show up here once students file them.'}
        />
      ) : (
        <div className="flex flex-col gap-12">
          {claims.map((claim) => (
            <ClaimReviewRow
              key={claim.id}
              claim={claim}
              reviewable={tab === 'pending' || claim.status === 'Pending'}
              onDecided={handleDecided}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ClaimReviewRow({ claim, reviewable, onDecided }) {
  const [showForm, setShowForm] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'approve' | 'reject'
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rowError, setRowError] = useState('');
  const [review, setReview] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  function startDecision(action) {
    setPendingAction(action);
    setShowForm(true);
    setRowError('');
  }

  async function submitDecision(e) {
    e.preventDefault();
    setSubmitting(true);
    setRowError('');
    try {
      const updated = await decideClaim(claim.id, {
        approve: pendingAction === 'approve',
        decisionNotes: notes.trim() || undefined,
      });
      onDecided(updated);
      setShowForm(false);
    } catch (err) {
      setRowError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function openReview() {
    setReviewLoading(true);
    setRowError('');
    try {
      setReview(await getClaimReview(claim.id));
    } catch (err) {
      setRowError(err.message);
    } finally {
      setReviewLoading(false);
    }
  }

  return (
    <div className="card card-pad claim-row">
      <div className="claim-row-main">
        <button type="button" className="claim-title claim-title-button" onClick={openReview} disabled={reviewLoading}>
          {claim.foundItemTitle}
          <span>{reviewLoading ? 'Loading details…' : 'View full review'}</span>
        </button>
        {claim.foundItemDescription && <p className="text-muted text-sm claim-desc">{claim.foundItemDescription}</p>}
        <p className="text-sm"><strong>Claimant:</strong> {claim.claimantEmail}</p>
        {claim.claimantNotes && <p className="text-sm"><strong>Proof of ownership:</strong> {claim.claimantNotes}</p>}
        {claim.decisionNotes && <p className="text-sm"><strong>Decision notes:</strong> {claim.decisionNotes}</p>}
        {claim.reviewedByEmail && (
          <p className="text-sm text-muted">Reviewed by {claim.reviewedByEmail} on {formatDate(claim.reviewedAt)}</p>
        )}

        {rowError && <Alert type="error">{rowError}</Alert>}
        {review && <ClaimEvidence review={review} />}

        {showForm && (
          <form onSubmit={submitDecision} className="decision-form">
            <Alert type="error">{rowError}</Alert>
            <div className="form-field">
              <label htmlFor={`notes-${claim.id}`}>
                {pendingAction === 'approve' ? 'Approval notes (optional)' : 'Reason for rejection (optional)'}
              </label>
              <textarea
                id={`notes-${claim.id}`}
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes for the record\u2026"
              />
            </div>
            <div className="flex gap-12">
              <button
                type="submit"
                className={`btn btn-sm ${pendingAction === 'approve' ? 'btn-primary' : 'btn-danger'}`}
                disabled={submitting}
              >
                {submitting && <ButtonSpinner />}
                Confirm {pendingAction === 'approve' ? 'Approval' : 'Rejection'}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)} disabled={submitting}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="claim-row-meta">
        <StatusBadge status={claim.status} />
        <span className="text-sm text-muted">Filed {formatDate(claim.createdAt)}</span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={openReview} disabled={reviewLoading}>
          {reviewLoading ? 'Loading…' : review ? 'Refresh details' : 'Review details'}
        </button>
        {reviewable && !showForm && (
          <div className="flex gap-8">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => startDecision('approve')}>
              Approve
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={() => startDecision('reject')}>
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ClaimEvidence({ review }) {
  return (
    <section className="claim-evidence" aria-label="Claim review evidence">
      <div className="claim-evidence-heading">
        <div><span className="eyebrow">Review evidence</span><h3>Item and people details</h3></div>
        <StatusBadge status={review.status} />
      </div>

      <div className="claim-evidence-grid">
        <EvidencePerson title="Claimant" person={review.claimant} />
        <EvidencePerson title="Reporter" person={review.reporter} />
      </div>

      <div className="claim-item-evidence">
        <h4>Found item report</h4>
        <p><strong>{review.foundItemTitle}</strong></p>
        <p className="text-muted text-sm">{review.foundItemDescription || 'No public description was provided.'}</p>
        <p className="text-sm"><strong>Reported found:</strong> {formatDate(review.foundAt)}</p>
        <p className="text-sm"><strong>Claimant’s ownership proof:</strong> {review.claimantNotes || 'No proof notes were supplied.'}</p>
        {review.imageUrls?.length > 0 ? (
          <div className="review-image-grid">
            {review.imageUrls.map((url, index) => <a key={url} href={publicAssetUrl(url)} target="_blank" rel="noreferrer"><img src={publicAssetUrl(url)} alt={`${review.foundItemTitle} evidence photo ${index + 1}`} /></a>)}
          </div>
        ) : <p className="text-muted text-sm">No photos were attached to this report.</p>}
      </div>
    </section>
  );
}

function EvidencePerson({ title, person }) {
  const fields = [
    ['Name', person?.fullName], ['Email', person?.email], ['Department', person?.department],
    ['Title', person?.jobTitle], ['Semester', person?.semester], ['Student ID', person?.studentId], ['Phone', person?.phone],
  ].filter(([, value]) => value);
  return <section className="claim-person-card"><h4>{title}</h4>{fields.length ? <dl>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : <p className="text-muted text-sm">No profile information available.</p>}</section>;
}
