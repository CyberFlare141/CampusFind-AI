import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getSuggestedMatches } from '../../api/security';
import { Alert, AIBadge, ConfidenceBar, EmptyState, PageLoading } from '../../components/Ui';

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
          <h1>AI Suggested Matches</h1>
          <p className="text-secondary">AI-generated pairings between lost and found reports, ranked by confidence score.</p>
        </div>
        <AIBadge label="AI Powered" />
      </motion.div>

      <Alert type="error">{error}</Alert>

      {loading ? (
        <PageLoading />
      ) : matches.length === 0 ? (
        <EmptyState
          icon="🔗"
          title="No suggested matches"
          message="Check back once more lost and found items have been reported."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {matches.map((match, i) => {
            const pct = Math.max(0, Math.min(100, Math.round(
              Number(match.confidenceScore) <= 1 ? Number(match.confidenceScore) * 100 : Number(match.confidenceScore)
            )));
            return (
              <motion.div
                key={match.id}
                className="card card-pad"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.35 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                  <span className="ai-badge"><span className="ai-spark">✦</span> {pct}% match</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center', marginBottom: 16 }}>
                  {/* Lost item */}
                  <div style={{ padding: '12px 16px', background: 'var(--warning-bg)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--warning)' }}>
                    <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--warning)', marginBottom: 4 }}>Lost Item</p>
                    <Link to={`/lost-items/${match.lostItemId}`} className="font-semibold" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.9rem' }}>
                      {match.lostItemTitle}
                    </Link>
                  </div>

                  {/* Arrow */}
                  <div style={{ textAlign: 'center', fontSize: '1.2rem', color: 'var(--primary)' }}>⟷</div>

                  {/* Found item */}
                  <div style={{ padding: '12px 16px', background: 'var(--success-bg)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--success)' }}>
                    <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--success)', marginBottom: 4 }}>Found Item</p>
                    <Link to={`/found-items/${match.foundItemId}`} className="font-semibold" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.9rem' }}>
                      {match.foundItemTitle}
                    </Link>
                  </div>
                </div>

                <ConfidenceBar score={pct} />
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
