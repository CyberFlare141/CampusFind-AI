import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function DashboardPage() {
  const { user } = useAuth();
  const isSecurityStaff =
    user?.role === 'SecurityOfficer' || user?.role === 'Administrator';

  return (
    <main>
      <section className="hero ticket">
        <div className="ticket-stub">
          <span className="eyebrow">Access pass</span>
          <strong className="ticket-role">{user?.role ?? 'Member'}</strong>
        </div>
        <div className="ticket-main">
          <p className="eyebrow">CampusFind AI</p>
          <h1>Welcome back</h1>
          <p className="muted">
            Signed in as {user?.email}. Report an item, browse the campus
            board, or check on a claim you've filed.
          </p>
        </div>
      </section>

      <div className="section-heading">
        <div>
          <p className="eyebrow">Where to next</p>
          <h2>Quick actions</h2>
        </div>
      </div>

      <div className="action-grid">
        <Link className="action-card" to="/lost-items" style={{ ['--tag-color' as string]: 'var(--peach)' }}>
          <span className="eyebrow">Lost items</span>
          <h3>Report or browse</h3>
          <p>Log something you've lost, or scan what the campus community has already reported.</p>
        </Link>
        <Link className="action-card" to="/found-items" style={{ ['--tag-color' as string]: 'var(--sky)' }}>
          <span className="eyebrow">Found items</span>
          <h3>Hand something in</h3>
          <p>Log an item you've found so its owner can submit a secure claim for it.</p>
        </Link>
        <Link className="action-card" to="/claims" style={{ ['--tag-color' as string]: 'var(--peach-deep)' }}>
          <span className="eyebrow">Claims</span>
          <h3>My claims</h3>
          <p>File a claim on a found item and track its verification status.</p>
        </Link>
        {isSecurityStaff && (
          <Link className="action-card" to="/security" style={{ ['--tag-color' as string]: 'var(--ink)' }}>
            <span className="eyebrow">Security</span>
            <h3>Officer console</h3>
            <p>Review pending claims, AI-suggested matches, and recent sign-in activity.</p>
          </Link>
        )}
      </div>
    </main>
  );
}
