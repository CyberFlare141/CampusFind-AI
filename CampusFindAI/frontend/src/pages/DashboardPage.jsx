import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyLostItems } from '../api/lostItems';
import { getMyFoundItems } from '../api/foundItems';
import { getMyClaims } from '../api/claims';
import { getSecurityOverview } from '../api/security';
import { PageLoading, Alert, StatusBadge, formatDate } from '../components/Ui';

export default function DashboardPage() {
  const { user, isOfficer } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [myLostItems, setMyLostItems] = useState([]);
  const [myFoundItems, setMyFoundItems] = useState([]);
  const [myClaims, setMyClaims] = useState([]);
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const tasks = [getMyLostItems(), getMyFoundItems(), getMyClaims()];
        if (isOfficer) tasks.push(getSecurityOverview());

        const results = await Promise.all(tasks);
        if (cancelled) return;

        setMyLostItems(results[0]);
        setMyFoundItems(results[1]);
        setMyClaims(results[2]);
        if (isOfficer) setOverview(results[3]);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isOfficer]);

  const openLostCount = myLostItems.filter((i) => i.status === 'Open').length;
  const pendingClaims = myClaims.filter((c) => c.status === 'Pending').length;
  const canReportItems = user?.role !== 'Administrator';

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <span className="eyebrow">Dashboard</span>
          <h1>Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}</h1>
          <p>Here&apos;s a snapshot of your CampusFind AI activity.</p>
        </div>
        {canReportItems && <div className="flex gap-12">
          <Link to="/lost-items/new" className="btn btn-secondary">+ Report Lost Item</Link>
          <Link to="/found-items/new" className="btn btn-accent">+ Report Found Item</Link>
        </div>}
      </div>

      <Alert type="error">{error}</Alert>

      {loading ? (
        <PageLoading label="Loading your dashboard\u2026" />
      ) : (
        <>
          <div className="item-grid" style={{ marginBottom: 28 }}>
            <StatCard label="Lost items reported" value={myLostItems.length} sub={`${openLostCount} still open`} />
            <StatCard label="Found items reported" value={myFoundItems.length} />
            <StatCard label="My claims" value={myClaims.length} sub={`${pendingClaims} pending review`} />
            {isOfficer && overview && (
              <StatCard label="Pending claims (all)" value={overview.pendingClaimsCount} accent />
            )}
            {isOfficer && overview && (
              <StatCard label="Suggested matches" value={overview.suggestedMatchesCount} accent />
            )}
          </div>

          <div className="dashboard-columns">
            <RecentSection
              title="Your recent lost item reports"
              viewAllTo="/lost-items?tab=mine"
              emptyMessage="You haven't reported any lost items yet."
              items={myLostItems.slice(0, 4)}
              renderItem={(item) => (
                <li key={item.id}>
                  <Link to={`/lost-items/${item.id}`}>{item.title}</Link>
                  <div className="flex items-center gap-8 text-sm text-muted">
                    <span>{formatDate(item.createdAt)}</span>
                    <StatusBadge status={item.status} />
                  </div>
                </li>
              )}
            />

            <RecentSection
              title="Your recent found item reports"
              viewAllTo="/found-items?tab=mine"
              emptyMessage="You haven't reported any found items yet."
              items={myFoundItems.slice(0, 4)}
              renderItem={(item) => (
                <li key={item.id}>
                  <Link to={`/found-items/${item.id}`}>{item.title}</Link>
                  <div className="text-sm text-muted">{formatDate(item.foundAt)}</div>
                </li>
              )}
            />

            <RecentSection
              title="Your claims"
              viewAllTo="/my-claims"
              emptyMessage="You haven't filed any ownership claims yet."
              items={myClaims.slice(0, 4)}
              renderItem={(claim) => (
                <li key={claim.id}>
                  <Link to={`/found-items/${claim.foundItemId}`}>{claim.foundItemTitle}</Link>
                  <div className="flex items-center gap-8 text-sm text-muted">
                    <span>{formatDate(claim.createdAt)}</span>
                    <StatusBadge status={claim.status} />
                  </div>
                </li>
              )}
            />
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="stat-card" style={accent ? { borderColor: 'var(--color-accent-500)' } : undefined}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="text-sm text-muted">{sub}</div>}
    </div>
  );
}

function RecentSection({ title, viewAllTo, emptyMessage, items, renderItem }) {
  return (
    <div className="card card-pad">
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 15 }}>{title}</h3>
        <Link to={viewAllTo} className="text-sm">View all</Link>
      </div>
      {items.length === 0 ? (
        <p className="text-muted text-sm">{emptyMessage}</p>
      ) : (
        <ul className="recent-list">{items.map(renderItem)}</ul>
      )}
    </div>
  );
}
