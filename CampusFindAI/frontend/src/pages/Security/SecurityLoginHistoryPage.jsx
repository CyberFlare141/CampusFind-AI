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
    <div className="page-container-wide">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div>
          <span className="eyebrow">Security Desk Audit</span>
          <h1>Officer Login History</h1>
          <p className="text-secondary">Audit log of your recent sign-in sessions and security actions.</p>
        </div>
      </motion.div>

      <Alert type="error">{error}</Alert>

      {loading ? (
        <PageLoading label="Loading login records…" />
      ) : history.length === 0 ? (
        <EmptyState
          svgIcon={(
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 32, height: 32 }}>
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          )}
          title="No login records found"
          message="Authentication audit records will appear here as sessions are recorded."
        />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Details</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry, i) => (
                <motion.tr
                  key={entry.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                >
                  <td>
                    <span className="badge badge-primary">
                      <span className="badge-dot" />
                      {entry.action}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    {entry.details || <span className="text-muted">—</span>}
                  </td>
                  <td className="text-sm text-muted font-medium">
                    {formatDate(entry.createdAt)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
