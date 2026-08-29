import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyClaims } from '../../api/claims';
import { Alert, EmptyState, PageLoading, StatusBadge, formatDate } from '../../components/Ui';

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
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <span className="eyebrow">Claims</span>
          <h1>My Claims</h1>
          <p>Track the status of ownership claims you&apos;ve filed on found items.</p>
        </div>
      </div>

      <Alert type="error">{error}</Alert>

      {loading ? (
        <PageLoading />
      ) : claims.length === 0 ? (
        <EmptyState
          icon="\u{1F4CB}"
          title="No claims yet"
          message="When you find an item that belongs to you, you can file a claim from its details page."
          action={<Link to="/found-items" className="btn btn-primary btn-sm">Browse Found Items</Link>}
        />
      ) : (
        <div className="flex flex-col gap-12">
          {claims.map((claim) => (
            <div className="card card-pad claim-row" key={claim.id}>
              <div className="claim-row-main">
                <Link to={`/found-items/${claim.foundItemId}`} className="claim-title">
                  {claim.foundItemTitle}
                </Link>
                {claim.foundItemDescription && (
                  <p className="text-muted text-sm claim-desc">{claim.foundItemDescription}</p>
                )}
                {claim.claimantNotes && (
                  <p className="text-sm"><strong>Your notes:</strong> {claim.claimantNotes}</p>
                )}
                {claim.decisionNotes && (
                  <p className="text-sm"><strong>Officer notes:</strong> {claim.decisionNotes}</p>
                )}
              </div>
              <div className="claim-row-meta">
                <StatusBadge status={claim.status} />
                <span className="text-sm text-muted">Filed {formatDate(claim.createdAt)}</span>
                {claim.reviewedAt && (
                  <span className="text-sm text-muted">Reviewed {formatDate(claim.reviewedAt)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
