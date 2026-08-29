import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSecurityOverview, getLoginConfirmation } from '../../api/security';
import { Alert, PageLoading, formatDate } from '../../components/Ui';

export default function SecurityOverviewPage() {
  const [overview, setOverview] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [overviewData, confirmationData] = await Promise.all([
          getSecurityOverview(),
          getLoginConfirmation(),
        ]);
        if (cancelled) return;
        setOverview(overviewData);
        setConfirmation(confirmationData);
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
          <span className="eyebrow">Security Office</span>
          <h1>Security Overview</h1>
          <p>Queue counts and sign-in confirmation for the Security Office.</p>
        </div>
      </div>

      <Alert type="error">{error}</Alert>

      {loading ? (
        <PageLoading />
      ) : (
        <>
          {confirmation && (
            <div className="alert alert-info" style={{ alignItems: 'center' }}>
              <span aria-hidden="true">{'\u{1F6E1}\uFE0F'}</span>
              <span>
                Signed in as <strong>{confirmation.email}</strong> ({confirmation.role}).{' '}
                {confirmation.lastLoginAt
                  ? <>Last sign-in was {formatDate(confirmation.lastLoginAt)}.</>
                  : 'This is your first recorded sign-in.'}
              </span>
            </div>
          )}

          <div className="item-grid" style={{ marginBottom: 24 }}>
            <div className="stat-card">
              <div className="label">Pending Claims</div>
              <div className="value">{overview?.pendingClaimsCount ?? 0}</div>
              <Link to="/security/claims" className="text-sm">Review queue &rarr;</Link>
            </div>
            <div className="stat-card">
              <div className="label">Suggested Matches</div>
              <div className="value">{overview?.suggestedMatchesCount ?? 0}</div>
              <Link to="/security/matches" className="text-sm">Review matches &rarr;</Link>
            </div>
          </div>

          <div className="card card-pad">
            <h3 style={{ fontSize: 15 }}>Quick links</h3>
            <div className="flex gap-12" style={{ flexWrap: 'wrap', marginTop: 10 }}>
              <Link to="/security/claims" className="btn btn-secondary btn-sm">Pending Claims</Link>
              <Link to="/security/matches" className="btn btn-secondary btn-sm">Suggested Matches</Link>
              <Link to="/security/login-history" className="btn btn-secondary btn-sm">Login History</Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
