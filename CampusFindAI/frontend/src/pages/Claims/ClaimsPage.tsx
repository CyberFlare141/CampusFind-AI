import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { createClaim, getMyClaims } from '../../services/claimService';
import { getAllFoundItems } from '../../services/foundItemService';
import type { FoundItem } from '../../services/foundItemService';
import type { Claim } from '../../types/security';

export function ClaimsPage() {
  const [foundItems, setFoundItems] = useState<FoundItem[]>([]);
  const [myClaims, setMyClaims] = useState<Claim[]>([]);

  const [foundItemId, setFoundItemId] = useState('');
  const [claimantNotes, setClaimantNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function loadData() {
    try {
      const [items, claims] = await Promise.all([
        getAllFoundItems(),
        getMyClaims(),
      ]);
      setFoundItems(items);
      setMyClaims(claims);
    } catch {
      setMessage('Could not load claims data.');
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!foundItemId) {
      setMessage('Select the found item you are claiming.');
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      await createClaim({
        foundItemId,
        claimantNotes: claimantNotes.trim() || undefined,
      });

      setFoundItemId('');
      setClaimantNotes('');
      setMessage('Claim submitted. A security officer will review it.');

      await loadData();
    } catch {
      setMessage('Could not submit your claim.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>File a Claim</h1>

      <form onSubmit={handleSubmit}>
        <label htmlFor="foundItemId">
          Found item
          <select
            id="foundItemId"
            value={foundItemId}
            onChange={(event) => setFoundItemId(event.target.value)}
          >
            <option value="">Select an item...</option>
            {foundItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="claimantNotes">
          Proof of ownership / identifying details
          <textarea
            id="claimantNotes"
            rows={4}
            value={claimantNotes}
            onChange={(event) => setClaimantNotes(event.target.value)}
            placeholder="Describe details only the true owner would know..."
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Claim'}
        </button>
      </form>

      {message && <p>{message}</p>}

      <hr />

      <h2>My Claims</h2>

      {myClaims.length === 0 ? (
        <p>You have not filed any claims yet.</p>
      ) : (
        <ul>
          {myClaims.map((claim) => (
            <li key={claim.id}>
              <strong>{claim.foundItemTitle}</strong>
              <p>Status: {claim.status}</p>
              {claim.decisionNotes && <p>Notes: {claim.decisionNotes}</p>}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
