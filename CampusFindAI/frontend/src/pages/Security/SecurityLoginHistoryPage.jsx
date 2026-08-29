import { useEffect, useState } from 'react';
import { getLoginHistory } from '../../api/security';
import { Alert, EmptyState, PageLoading, formatDate } from '../../components/Ui';

export default function SecurityLoginHistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await getLoginHistory();
        if (!cancelled) setHistory(data);
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
          <h1>Login History</h1>
          <p>Your most recent sign-in activity, for audit purposes.</p>
        </div>
      </div>

      <Alert type="error">{error}</Alert>

      {loading ? (
        <PageLoading />
      ) : history.length === 0 ? (
        <EmptyState icon="\u{1F551}" title="No login history yet" />
      ) : (
        <div className="card data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Details</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => (
                <tr key={entry.id}>
                  <td><span className="badge badge-info">{entry.action}</span></td>
                  <td>{entry.details || <span className="text-muted">&mdash;</span>}</td>
                  <td className="text-sm text-muted">{formatDate(entry.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
