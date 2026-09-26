import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyReputation } from '../api/reputation';
import { formatBangladeshDate } from '../api/client';
import { Alert, AnimatedNumber, EmptyState, SlideIn } from '../components/Ui';

export default function ReputationHistoryPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { getMyReputation().then(setData).catch(e => setError(e.message)); }, []);

  return (
    <section className="page-container reputation-page">
      <header className="page-header reputation-header">
        <div>
          <Link className="back-link" to="/profile">Back to profile</Link>
          <span className="eyebrow">Return ledger</span>
          <h1>Your reputation</h1>
          <p className="text-secondary">A record of the help you have given to return campus property.</p>
        </div>
      </header>
      {error && <Alert type="error">{error}</Alert>}
      {!data ? (
        <div className="reputation-loading" role="status">Opening your return ledger...</div>
      ) : (
        <>
          <section className="reputation-score-card">
            <span className="reputation-score-label">Current standing</span>
            <strong><AnimatedNumber value={data.points} /></strong>
            <span className="reputation-score-unit">points</span>
            <span className="reputation-level">{data.level}</span>
          </section>
          <section className="reputation-history" aria-label="Reputation history">
            <div className="reputation-history-heading">
              <h2>History</h2>
              <span>{data.history.length} entries</span>
            </div>
            {data.history.length === 0 ? (
              <EmptyState title="No ledger entries yet" message="Your history will appear when you help return an item." />
            ) : (
              <ol className="reputation-ledger">
                {data.history.map((event, index) => (
                  <SlideIn key={event.id} as="li" from="left" delay={Math.min(index * 0.04, 0.28)} className="reputation-ledger-entry">
                    <span className={`reputation-points ${event.pointChange > 0 ? 'is-positive' : ''}`}>
                      {event.pointChange > 0 ? '+' : ''}{event.pointChange}
                    </span>
                    <div>
                      <strong>{event.reason}</strong>
                      <time>{formatBangladeshDate(event.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</time>
                    </div>
                  </SlideIn>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </section>
  );
}
