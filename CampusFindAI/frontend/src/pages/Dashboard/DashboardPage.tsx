import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function DashboardPage() {
  const { user } = useAuth();
  const isSecurityStaff =
    user?.role === 'SecurityOfficer' || user?.role === 'Administrator';

  return (
    <main>
      <h1>Dashboard</h1>
      <p>Signed in as {user?.email} ({user?.role})</p>

      <ul>
        <li>
          <Link to="/lost-items">Lost Items</Link>
        </li>
        <li>
          <Link to="/found-items">Found Items</Link>
        </li>
        <li>
          <Link to="/claims">My Claims</Link>
        </li>
        {isSecurityStaff && (
          <li>
            <Link to="/security">Security Officer Console</Link>
          </li>
        )}
      </ul>
    </main>
  );
}
