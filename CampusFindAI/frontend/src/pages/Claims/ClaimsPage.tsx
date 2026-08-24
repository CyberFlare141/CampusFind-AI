import { useEffect, useState, type FormEvent } from 'react';
import { createClaim, getMyClaims } from '../../services/claimService';
import { getAllFoundItems, type FoundItem } from '../../services/foundItemService';
import type { Claim } from '../../types/security';
import { getApiError } from '../../services/apiError';
import { Notice } from '../../components/Notice';

export function ClaimsPage() {
  const [foundItems, setFoundItems] = useState<FoundItem[]>([]);
  const [myClaims, setMyClaims] = useState<Claim[]>([]);
  const [foundItemId, setFoundItemId] = useState('');
  const [claimantNotes, setClaimantNotes] = useState('');
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadFoundItems() {
    setLoadingItems(true);
    try { setFoundItems(await getAllFoundItems()); }
    catch (error) { setError(getApiError(error, 'Could not load found items available to claim.')); }
    finally { setLoadingItems(false); }
  }
  async function loadClaims() {
    setLoadingClaims(true);
    try { setMyClaims(await getMyClaims()); }
    catch (error) { setError(getApiError(error, 'Could not load your claim history.')); }
    finally { setLoadingClaims(false); }
  }
  function refresh() { setError(''); void loadFoundItems(); void loadClaims(); }
  useEffect(() => { refresh(); }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!foundItemId) { setError('Select the found item you are claiming.'); return; }
    setSubmitting(true); setError(''); setSuccess('');
    try {
      await createClaim({ foundItemId, claimantNotes: claimantNotes.trim() || undefined });
      setFoundItemId(''); setClaimantNotes(''); setSuccess('Claim submitted. A security officer will review it.');
      await loadClaims();
    } catch (error) { setError(getApiError(error, 'Could not submit your claim.')); }
    finally { setSubmitting(false); }
  }

  return <div className="content-grid"><section className="form-panel"><p className="eyebrow">Ownership verification</p><h1>File a claim</h1><p className="muted">Choose a found item and give details that help verify ownership.</p>
    <form onSubmit={handleSubmit}><label htmlFor="foundItemId">Found item<select id="foundItemId" value={foundItemId} onChange={(e) => setFoundItemId(e.target.value)} disabled={loadingItems || foundItems.length === 0} required><option value="">{loadingItems ? 'Loading found items...' : foundItems.length ? 'Select an item...' : 'No found items available'}</option>{foundItems.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      <label htmlFor="claimantNotes">Proof of ownership / identifying details<textarea id="claimantNotes" rows={5} value={claimantNotes} onChange={(e) => setClaimantNotes(e.target.value)} placeholder="Describe details only the true owner would know..." /></label>
      <button className="button" type="submit" disabled={submitting || loadingItems || foundItems.length === 0}>{submitting ? 'Submitting...' : 'Submit claim'}</button>
    </form>{error && <Notice>{error}</Notice>}{success && <Notice type="success">{success}</Notice>}
  </section><section className="reports-panel"><div className="section-heading"><div><p className="eyebrow">Claim tracking</p><h2>My claims</h2></div><button type="button" className="button button-secondary" onClick={refresh} disabled={loadingItems || loadingClaims}>Refresh</button></div>
    {loadingClaims ? <p className="loading">Loading your claims...</p> : myClaims.length === 0 ? <p className="empty-state">You have not filed any claims yet.</p> : <div className="report-list">{myClaims.map((claim) => <article className="report-card" key={claim.id}><div><h4>{claim.foundItemTitle}</h4><p>{claim.decisionNotes || 'Awaiting a security officer review.'}</p><small>Submitted {new Date(claim.createdAt).toLocaleString()}</small></div><span className={`badge badge-${claim.status.toLowerCase()}`}>{claim.status}</span></article>)}</div>}
  </section></div>;
}
