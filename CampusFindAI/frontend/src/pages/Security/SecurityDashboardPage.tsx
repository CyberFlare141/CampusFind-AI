import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SecurityNav } from '../../components/SecurityNav';
import { getSecurityOverview } from '../../services/securityService';
import type { SecurityOverview } from '../../types/security';

export function SecurityDashboardPage() {
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await getSecurityOverview();
        setOverview(data);
      } catch {
        setMessage('Could not load the security overview.');
      }
    }

    load();
  }, []);

  return (
    <main className="wide-main">
      <h1>Security Officer Console</h1>
      <SecurityNav />

      {message && <p role="alert">{message}</p>}

      <div className="stat-cards">
        <div className="stat-card">
          <span>Pending Claims</span>
          <strong>{overview ? overview.pendingClaimsCount : '—'}</strong>
          <Link to="/security/claims">Review queue</Link>
        </div>

        <div className="stat-card">
          <span>Suggested Matches</span>
          <strong>{overview ? overview.suggestedMatchesCount : '—'}</strong>
          <Link to="/security/matches">Review matches</Link>
        </div>
      </div>

      <p>
        Use the links above to review claims awaiting a verification
        decision, inspect AI-suggested lost/found matches, or check your
        recent sign-in activity.
      </p>
    </main>
  );
}
