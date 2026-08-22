import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SecurityNav } from '../../components/SecurityNav';
import { decideClaim, getClaimById } from '../../services/claimService';
import type { Claim } from '../../types/security';

export function ClaimReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [claim, setClaim] = useState<Claim | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  async function loadClaim() {
    if (!id) {
      return;
    }

    try {
      setLoading(true);
      const data = await getClaimById(id);
      setClaim(data);
    } catch {
      setMessage('Could not load this claim.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClaim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleDecision(approve: boolean) {
    if (!id) {
      return;
    }

    try {
      setSubmitting(true);
      setMessage('');

      const updated = await decideClaim(id, {
        approve,
        decisionNotes: decisionNotes.trim() || undefined,
      });

      setClaim(updated);
      setMessage(
        approve
          ? 'Claim approved. The claimant can now be notified to collect the item.'
          : 'Claim rejected.'
      );
    } catch {
      setMessage('Could not record the verification decision.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="wide-main">
        <h1>Claim Verification</h1>
        <SecurityNav />
        <p>Loading claim...</p>
      </main>
    );
  }

  if (!claim) {
    return (
      <main className="wide-main">
        <h1>Claim Verification</h1>
        <SecurityNav />
        {message && <p role="alert">{message}</p>}
      </main>
    );
  }

  const isPending = claim.status === 'Pending';

  return (
    <main className="wide-main">
      <h1>Claim Verification</h1>
      <SecurityNav />

      {message && <p role="alert">{message}</p>}

      <div className="detail-card">
        <h2>{claim.foundItemTitle}</h2>
        <p>{claim.foundItemDescription || 'No description provided.'}</p>

        <p>
          <strong>Status:</strong> <StatusBadge status={claim.status} />
        </p>

        <p>
          <strong>Claimant:</strong> {claim.claimantEmail}
        </p>

        <p>
          <strong>Submitted:</strong>{' '}
          {new Date(claim.createdAt).toLocaleString()}
        </p>

        <p>
          <strong>Claimant's proof of ownership:</strong>
          <br />
          {claim.claimantNotes || 'No notes provided.'}
        </p>

        {!isPending && (
          <>
            <p>
              <strong>Reviewed by:</strong> {claim.reviewedByEmail}{' '}
              {claim.reviewedAt &&
                `on ${new Date(claim.reviewedAt).toLocaleString()}`}
            </p>
            <p>
              <strong>Decision notes:</strong>{' '}
              {claim.decisionNotes || 'None'}
            </p>
          </>
        )}
      </div>

      {isPending && (
        <div>
          <label htmlFor="decisionNotes">
            Decision notes (optional)
          </label>
          <br />
          <textarea
            id="decisionNotes"
            rows={4}
            value={decisionNotes}
            onChange={(event) => setDecisionNotes(event.target.value)}
            placeholder="e.g. Serial number and description matched."
            style={{ width: '100%', marginTop: '0.4rem', marginBottom: '1rem' }}
          />

          <div className="button-row">
            <button
              type="button"
              className="button-approve"
              disabled={submitting}
              onClick={() => handleDecision(true)}
            >
              {submitting ? 'Submitting...' : 'Approve Claim'}
            </button>
            <button
              type="button"
              className="button-reject"
              disabled={submitting}
              onClick={() => handleDecision(false)}
            >
              {submitting ? 'Submitting...' : 'Reject Claim'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/security/claims')}
            >
              Back to queue
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === 'Approved'
      ? 'badge badge-approved'
      : status === 'Rejected'
        ? 'badge badge-rejected'
        : 'badge badge-pending';

  return <span className={className}>{status}</span>;
}
