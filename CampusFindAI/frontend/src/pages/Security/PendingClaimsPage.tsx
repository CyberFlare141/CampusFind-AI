import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SecurityNav } from '../../components/SecurityNav';
import { getPendingClaims } from '../../services/claimService';
import type { Claim } from '../../types/security';

export function PendingClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  async function loadClaims() {
    try {
      setLoading(true);
      const data = await getPendingClaims();
      setClaims(data);
    } catch {
      setMessage('Could not load pending claims.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClaims();
  }, []);

  return (
    <main className="wide-main">
      <h1>Pending Claims</h1>
      <SecurityNav />

      {message && <p role="alert">{message}</p>}

      {loading ? (
        <p>Loading pending claims...</p>
      ) : claims.length === 0 ? (
        <p>There are no claims awaiting review.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Found Item</th>
              <th>Claimant</th>
              <th>Submitted</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {claims.map((claim) => (
              <tr key={claim.id}>
                <td>{claim.foundItemTitle}</td>
                <td>{claim.claimantEmail}</td>
                <td>{new Date(claim.createdAt).toLocaleString()}</td>
                <td>{claim.claimantNotes || '—'}</td>
                <td>
                  <Link to={`/security/claims/${claim.id}`}>Review</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
