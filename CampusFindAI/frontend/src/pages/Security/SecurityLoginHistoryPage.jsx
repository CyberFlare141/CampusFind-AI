import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
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
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="page-container">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div>
          <span className="eyebrow">🛡️ Security Office</span>
          <h1>Login History</h1>
          <p className="text-secondary">Your most recent sign-in activity, for audit purposes.</p>
        </div>
      </motion.div>

      <Alert type="error">{error}</Alert>

      {loading ? (
        <PageLoading />
      ) : history.length === 0 ? (
        <EmptyState icon="🕑" title="No login history yet" />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Details</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry, i) => (
                <motion.tr
                  key={entry.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <td><span className="badge badge-info">{entry.action}</span></td>
                  <td>{entry.details || <span className="text-muted">—</span>}</td>
                  <td className="text-sm text-muted">{formatDate(entry.createdAt)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
