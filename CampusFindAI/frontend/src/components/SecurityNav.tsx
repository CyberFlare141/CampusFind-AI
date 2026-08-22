import { Link } from 'react-router-dom';

export function SecurityNav() {
  return (
    <nav className="security-nav">
      <Link to="/security">Overview</Link>
      <Link to="/security/claims">Pending Claims</Link>
      <Link to="/security/matches">Suggested Matches</Link>
      <Link to="/security/login-confirmation">Login Confirmation</Link>
      <Link to="/security/login-history">Login Detail</Link>
      <Link to="/dashboard">Back to Dashboard</Link>
    </nav>
  );
}
