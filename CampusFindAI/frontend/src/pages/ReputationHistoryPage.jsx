import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyReputation } from '../api/reputation';
import { formatBangladeshDate } from '../api/client';

export default function ReputationHistoryPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { getMyReputation().then(setData).catch(e => setError(e.message)); }, []);
  return <section className="page-container"><header className="page-header"><Link to="/profile">← Profile</Link><h1>Your reputation</h1></header>
    {error && <p role="alert">{error}</p>}{!data ? <p>Loading reputation…</p> : <>
      <div className="card" style={{ padding: 24, marginBottom: 20 }}><strong style={{ fontSize: 32 }}>{data.points}</strong><span> points · {data.level}</span></div>
      <h2>History</h2>{data.history.length === 0 ? <p>Your reputation history will appear here when you help return an item.</p> : <ul>{data.history.map(event => <li key={event.id} style={{ padding: '12px 0' }}><strong>{event.pointChange > 0 ? '+' : ''}{event.pointChange} points</strong> — {event.reason}<div className="text-sm text-muted">{formatBangladeshDate(event.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</div></li>)}</ul>}
    </>}</section>;
}
