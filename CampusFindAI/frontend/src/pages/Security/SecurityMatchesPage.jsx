import { useEffect, useState } from 'react';
import { getSuggestedMatches } from '../../api/security';
import { Alert, EmptyState, PageLoading } from '../../components/Ui';

export default function SecurityMatchesPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await getSuggestedMatches();
        if (!cancelled) setMatches(data);
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
          <h1>Suggested Matches</h1>
          <p>AI-suggested pairings between lost and found item reports, ranked by confidence.</p>
        </div>
      </div>

      <Alert type="error">{error}</Alert>

      {loading ? (
        <PageLoading />
      ) : matches.length === 0 ? (
        <EmptyState icon="\u{1F517}" title="No suggested matches" message="Check back once more lost and found items have been reported." />
      ) : (
        <div className="card data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Lost Item</th>
                <th>Found Item</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => (
                <tr key={match.id}>
                  <td>{match.lostItemTitle}</td>
                  <td>{match.foundItemTitle}</td>
                  <td>
                    <ConfidenceBar value={match.confidenceScore} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ConfidenceBar({ value }) {
  const pct = Math.max(0, Math.min(100, Math.round(Number(value) <= 1 ? Number(value) * 100 : Number(value))));
  const tone = pct >= 75 ? 'var(--color-success-600)' : pct >= 45 ? 'var(--color-warning-600)' : 'var(--color-danger-600)';
  return (
    <div className="confidence-bar">
      <div className="confidence-track">
        <div className="confidence-fill" style={{ width: `${pct}%`, background: tone }} />
      </div>
      <span className="text-sm" style={{ color: tone, fontWeight: 700 }}>{pct}%</span>
    </div>
  );
}
