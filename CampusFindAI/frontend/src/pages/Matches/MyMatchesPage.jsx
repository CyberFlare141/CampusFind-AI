import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyMatches } from '../../api/matches';
import { getOwnershipVerificationStatus } from '../../api/ownershipVerification';
import { publicAssetUrl } from '../../api/client';
import { AIBadge, Alert, ConfidenceBar, EmptyState, PageLoading } from '../../components/Ui';

function MatchItem({ match, verification }) {
  const score = Math.round(match.confidenceScore);
  const level = score >= 80 ? 'High confidence' : score >= 50 ? 'Possible match' : 'Review recommended';
  return (
    <article className="match-comparison-card">
      <div className="match-comparison-heading">
        <div><AIBadge label="AI Match" /><h2>{match.lostItemTitle} <span aria-hidden="true">↔</span> {match.foundItemTitle}</h2></div>
        <div className="match-score" aria-label={String(score) + '% ' + level}><strong>{score}%</strong><span>{level}</span></div>
      </div>
      <div className="match-comparison-grid">
        <section className="match-item-panel match-item-panel-lost">
          <span className="match-panel-label">Lost report</span>
          <div className="match-item-visual match-item-visual-placeholder" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
          <h3>{match.lostItemTitle}</h3><p>{match.lostCategoryName || 'Uncategorized'}</p><div className="match-location">{match.lostLocationName || 'Campus location not specified'}</div>
        </section>
        <section className="match-confidence-panel"><span className="match-panel-label">AI confidence</span><strong>{score}%</strong><span>{level}</span><div className="match-confidence-line" aria-hidden="true" /></section>
        <section className="match-item-panel match-item-panel-found">
          <span className="match-panel-label">Found item</span>
          <div className="match-item-visual">{match.foundImageUrl ? <img src={publicAssetUrl(match.foundImageUrl)} alt={'Found item: ' + match.foundItemTitle} /> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7H4a2 2 0 0 0 2 2h16a2 2 0 0 0 2 2V9a2 2 0 0 0-2-2z"/><polyline points="16 3 12 7 8 3"/></svg>}</div>
          <h3>{match.foundItemTitle}</h3><p>{match.foundCategoryName || 'Uncategorized'}</p><div className="match-location">{match.foundLocationName || 'Campus location not specified'}</div>
        </section>
      </div>
      <div className="match-card-footer">
        <div className="match-rationale"><p>{match.explanation}</p>{match.matchedAttributes?.length > 0 && <ul>{match.matchedAttributes.map(attribute => <li key={attribute}>{attribute}</li>)}</ul>}<ConfidenceBar score={match.confidenceScore} />
          <p className="text-sm" style={{ marginTop: 12, fontWeight: 700 }}>{verification?.message || (score < 60 ? 'Ownership verification unavailable' : 'Checking verification eligibility…')}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><Link className="btn btn-secondary" to={'/found-items/' + match.foundItemId}>View found item</Link>{verification?.canStart && <Link className="btn btn-primary" to={`/matches/${match.id}/verify`}>{verification.attemptCount ? 'Retry Ownership Verification' : 'Start Ownership Verification'}</Link>}{verification?.canAccessHandoverChat && <span className="badge badge-success">Handover chat eligible</span>}</div>
      </div>
    </article>
  );
}

export default function MyMatchesPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [verificationByMatch, setVerificationByMatch] = useState({});
  useEffect(() => { getMyMatches().then(async list => { setMatches(list); const statuses = await Promise.all(list.map(async match => [match.id, await getOwnershipVerificationStatus(match.id).catch(() => null)])); setVerificationByMatch(Object.fromEntries(statuses.filter(([, status]) => status))); }).catch(err => setError(err.message)).finally(() => setLoading(false)); }, []);
  if (loading) return <PageLoading label="Finding your AI matches…" />;
  return <div className="page-container-wide matches-page">
    <div className="page-header"><div><AIBadge label="Student discovery" /><h1>My AI Matches</h1><p>Potential matches for your open lost-item reports. Review each suggestion before making a claim.</p></div></div>
    <Alert type="error">{error}</Alert>
    {!error && matches.length === 0 ? <EmptyState title="No suggested matches yet" message="When a compatible found-item report is submitted, it will appear here automatically." action={<Link className="btn btn-primary" to="/found-items">Browse found items</Link>} /> : <div className="match-comparison-list">{matches.map(match => <MatchItem key={match.id} match={match} verification={verificationByMatch[match.id]} />)}</div>}
  </div>;
}
