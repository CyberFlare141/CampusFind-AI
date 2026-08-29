import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getAllLostItems, getMyLostItems } from '../../api/lostItems';
import { useAuth } from '../../context/AuthContext';
import ItemCard from '../../components/ItemCard';
import { Alert, EmptyState, SkeletonCard } from '../../components/Ui';

export default function LostItemsListPage() {
  const { user } = useAuth();
  const canReportItems = user?.role !== 'Administrator';
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'mine' ? 'mine' : 'all';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = tab === 'mine' ? await getMyLostItems() : await getAllLostItems();
        if (!cancelled) setItems(data);
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
  }, [tab]);

  const statuses = useMemo(() => {
    const set = new Set(items.map((i) => i.status).filter(Boolean));
    return Array.from(set);
  }, [items]);

  const filtered = items.filter((item) => {
    const matchesQuery =
      !query.trim() ||
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <span className="eyebrow">Lost items</span>
          <h1>Lost Item Reports</h1>
          <p>Browse items reported lost across campus, or file a new report.</p>
        </div>
        {canReportItems && <Link to="/lost-items/new" className="btn btn-primary">+ Report a Lost Item</Link>}
      </div>

      <div className="tabs">
        <button
          type="button"
          className={`tab-btn ${tab === 'all' ? 'active' : ''}`}
          onClick={() => setSearchParams({ tab: 'all' })}
        >
          All Lost Items
        </button>
        <button
          type="button"
          className={`tab-btn ${tab === 'mine' ? 'active' : ''}`}
          onClick={() => setSearchParams({ tab: 'mine' })}
        >
          My Reports
        </button>
      </div>

      <div className="filter-bar">
        <input
          type="search"
          placeholder="Search by title or description\u2026"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search lost items"
        />
        {statuses.length > 0 && (
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
            <option value="all">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
      </div>

      <Alert type="error">{error}</Alert>

      {loading ? (
        <div className="item-grid">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="\u{1F937}"
          title={tab === 'mine' ? "You haven't reported any lost items" : 'No lost items match your search'}
          message={tab === 'mine' ? 'Lost something on campus? Let others know so they can help.' : 'Try a different search term or check back later.'}
          action={canReportItems ? <Link to="/lost-items/new" className="btn btn-primary btn-sm">Report a Lost Item</Link> : null}
        />
      ) : (
        <div className="item-grid">
          {filtered.map((item) => (
            <ItemCard key={item.id} kind="lost" item={item} mine={item.userId === user?.id} />
          ))}
        </div>
      )}
    </div>
  );
}
