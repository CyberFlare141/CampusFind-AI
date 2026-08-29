import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getAllFoundItems, getMyFoundItems } from '../../api/foundItems';
import { useAuth } from '../../context/AuthContext';
import ItemCard from '../../components/ItemCard';
import { Alert, EmptyState, SkeletonCard } from '../../components/Ui';

export default function FoundItemsListPage() {
  const { user } = useAuth();
  const canReportItems = user?.role !== 'Administrator';
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'mine' ? 'mine' : 'all';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = tab === 'mine' ? await getMyFoundItems() : await getAllFoundItems();
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

  const filtered = items.filter((item) => {
    if (!query.trim()) return true;
    return (
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(query.toLowerCase())
    );
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <span className="eyebrow">Found items</span>
          <h1>Found Item Reports</h1>
          <p>Browse items that have been found on campus, or log something you found.</p>
        </div>
        {canReportItems && <Link to="/found-items/new" className="btn btn-primary">+ Report a Found Item</Link>}
      </div>

      <div className="tabs">
        <button
          type="button"
          className={`tab-btn ${tab === 'all' ? 'active' : ''}`}
          onClick={() => setSearchParams({ tab: 'all' })}
        >
          All Found Items
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
          aria-label="Search found items"
        />
      </div>

      <Alert type="error">{error}</Alert>

      {loading ? (
        <div className="item-grid">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="\u{1F4E6}"
          title={tab === 'mine' ? "You haven't reported any found items" : 'No found items match your search'}
          message={tab === 'mine' ? 'Found something? Log it so the owner can claim it.' : 'Try a different search term or check back later.'}
          action={canReportItems ? <Link to="/found-items/new" className="btn btn-primary btn-sm">Report a Found Item</Link> : null}
        />
      ) : (
        <div className="item-grid">
          {filtered.map((item) => (
            <ItemCard key={item.id} kind="found" item={item} mine={item.userId === user?.id} />
          ))}
        </div>
      )}
    </div>
  );
}
