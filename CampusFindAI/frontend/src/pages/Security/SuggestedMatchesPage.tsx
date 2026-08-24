import { useEffect, useState } from 'react';
import { SecurityNav } from '../../components/SecurityNav';
import { getSuggestedMatches } from '../../services/matchService';
import type { SuggestedMatch } from '../../types/security';

export function SuggestedMatchesPage() {
  const [matches, setMatches] = useState<SuggestedMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  async function loadMatches() {
    try {
      setLoading(true);
      setMessage('');
      const data = await getSuggestedMatches();
      setMatches(data);
    } catch {
      setMessage('Could not load suggested matches.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMatches();
  }, []);

  return (
    <main className="wide-main">
      <h1>Suggested Matches</h1>
      <SecurityNav />

      <p>
        Candidate lost/found pairs, ranked by confidence. Refresh this view to
        see the latest suggestions currently available from the system.
      </p>

      <button type="button" onClick={loadMatches} disabled={loading}>
        {loading ? 'Refreshing...' : 'Refresh suggestions'}
      </button>

      {message && <p role="alert">{message}</p>}

      {!loading && matches.length === 0 ? (
        <p>No candidate matches were found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Lost Item</th>
              <th>Found Item</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((match) => (
              <tr key={match.id}>
                <td>{match.lostItemTitle}</td>
                <td>{match.foundItemTitle}</td>
                <td>{match.confidenceScore.toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
