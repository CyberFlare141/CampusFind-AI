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
    <div className="page-container-wide">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div>
          <span className="eyebrow">AI Matching Engine</span>
          <h1>Suggested Item Pairings</h1>
          <p className="text-secondary">
            AI cross-references lost and found reports using keyword semantics, category tagging, and time proximity.
          </p>
        </div>
        <AIBadge label="AI Ranked" />
      </motion.div>

      <Alert type="error">{error}</Alert>

      {loading ? (
        <PageLoading label="Analyzing matches…" />
      ) : matches.length === 0 ? (
        <EmptyState
          svgIcon={(
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 32, height: 32 }}>
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          )}
          title="No suggested pairings yet"
          message="As new lost and found reports are submitted on campus, AI will automatically detect correlations and list them here."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {matches.map((match, i) => {
            const pct = Math.max(0, Math.min(100, Math.round(
              Number(match.confidenceScore) <= 1 ? Number(match.confidenceScore) * 100 : Number(match.confidenceScore)
            )));
            return (
              <motion.div
                key={match.id}
                className="card card-pad-lg"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.28), duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                  <span className="ai-badge">
                    <span className="ai-spark">✦</span> {pct}% AI Match Confidence
                  </span>
                  <span className="text-xs text-muted font-bold" style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Paired Record #{match.id?.slice(0, 8) || i + 1}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center', marginBottom: 18 }}>
                  {/* Lost item */}
                  <div style={{
                    padding: '16px 20px',
                    background: 'var(--warning-bg)',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: '4px solid var(--warning)',
                  }}>
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--warning)', marginBottom: 4 }}>
                      Lost Item Report
                    </p>
                    <Link to={`/lost-items/${match.lostItemId}`} className="font-bold" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontSize: '1rem', display: 'inline-block' }}>
                      {match.lostItemTitle} →
                    </Link>
                  </div>

                  {/* Direction Arrow */}
                  <div style={{
                    width: 38, height: 38,
                    borderRadius: '50%',
                    background: 'var(--surface)',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--primary-deep)',
                    fontWeight: 800,
                    boxShadow: 'var(--shadow-sm)',
                  }}>
                    ⟷
                  </div>

                  {/* Found item */}
                  <div style={{
                    padding: '16px 20px',
                    background: 'var(--success-bg)',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: '4px solid var(--success)',
                  }}>
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--success)', marginBottom: 4 }}>
                      Found Item Log
                    </p>
                    <Link to={`/found-items/${match.foundItemId}`} className="font-bold" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontSize: '1rem', display: 'inline-block' }}>
                      {match.foundItemTitle} →
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
