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
        Potential lost/found pairs, ranked by confidence. These are AI-assisted
        suggestions only: Security Officers must verify ownership before making
        a decision.
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
              <th>Why it was suggested</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((match) => (
              <tr key={match.id}>
                <td>{match.lostItemTitle}</td>
                <td>{match.foundItemTitle}</td>
                <td>{match.confidenceScore.toFixed(0)}%</td>
                <td>
                  <div>{match.explanation}</div>
                  {match.matchedAttributes.length > 0 && (
                    <ul className="match-attributes">
                      {match.matchedAttributes.map((attribute) => <li key={attribute}>{attribute}</li>)}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
