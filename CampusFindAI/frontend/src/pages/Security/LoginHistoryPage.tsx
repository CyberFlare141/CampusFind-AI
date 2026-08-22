import { useEffect, useState } from 'react';
import { SecurityNav } from '../../components/SecurityNav';
import { getLoginHistory } from '../../services/securityService';
import type { LoginHistoryEntry } from '../../types/security';

export function LoginHistoryPage() {
  const [entries, setEntries] = useState<LoginHistoryEntry[]>([]);
  const [selected, setSelected] = useState<LoginHistoryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getLoginHistory();
        setEntries(data);
      } catch {
        setMessage('Could not load login history.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <main className="wide-main">
      <h1>Login Detail</h1>
      <SecurityNav />

      {message && <p role="alert">{message}</p>}

      {selected && (
        <div className="detail-card">
          <h2>Login Event</h2>
          <p>
            <strong>When:</strong>{' '}
            {new Date(selected.createdAt).toLocaleString()}
          </p>
          <p>
            <strong>Action:</strong> {selected.action}
          </p>
          <p>
            <strong>Details:</strong> {selected.details || 'No further details recorded.'}
          </p>
          <button type="button" onClick={() => setSelected(null)}>
            Close
          </button>
        </div>
      )}

      {loading ? (
        <p>Loading login history...</p>
      ) : entries.length === 0 ? (
        <p>No login activity has been recorded yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Details</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{new Date(entry.createdAt).toLocaleString()}</td>
                <td>{entry.details || '—'}</td>
                <td>
                  <button type="button" onClick={() => setSelected(entry)}>
                    View detail
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
