import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getAllFoundItems, getMyFoundItems } from '../../api/foundItems';
import { useAuth } from '../../context/AuthContext';
import { Alert, EmptyState, SkeletonGrid, ItemCard } from '../../components/Ui';

export default function FoundItemsListPage() {
  const { user } = useAuth();
  const canReportItems = user?.role !== 'Administrator';
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'mine' ? 'mine' : 'all';
  const initialSearch = searchParams.get('search') || '';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const urlQuery = searchParams.get('search');
    if (urlQuery != null) {
      setQuery(urlQuery);
    }
  }, [searchParams]);

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
    return () => { cancelled = true; };
  }, [tab]);

  const statuses = useMemo(() => Array.from(new Set(items.map(i => i.status).filter(Boolean))), [items]);

  const filtered = items.filter(item => {
    const matchesQuery =
      !query.trim() ||
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="page-container-wide">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div>
          <span className="eyebrow">Campus Catalog</span>
          <h1>Found Item Reports</h1>
          <p className="text-secondary">
            Browse items found across campus grounds. If you recognize something of yours, submit an ownership claim.
          </p>
        </div>
        {canReportItems && (
          <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}>
            <Link to="/found-items/new" className="btn btn-primary btn-lg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><polyline points="16 3 12 7 8 3"/>
              </svg>
              + Report Found Item
            </Link>
          </motion.div>
        )}
      </motion.div>

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <div className="tabs">
        <button
          type="button"
          className={`tab-btn ${tab === 'all' ? 'active' : ''}`}
          onClick={() => setSearchParams({ tab: 'all', ...(query ? { search: query } : {}) })}
        >
          All Found Items ({tab === 'all' ? items.length : '…'})
        </button>
        <button
          type="button"
          className={`tab-btn ${tab === 'mine' ? 'active' : ''}`}
          onClick={() => setSearchParams({ tab: 'mine', ...(query ? { search: query } : {}) })}
        >
          My Reports ({tab === 'mine' ? items.length : '…'})
        </button>
      </div>

      {/* ── Search & Filter Controls ────────────────────────────── */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <span style={{ position: 'absolute', left: '1.1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary-deep)', fontSize: '1rem', pointerEvents: 'none' }}>
            ✦
          </span>
          <input
            type="search"
            placeholder="Search by keywords, title, or description…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search found items"
            style={{ paddingLeft: '2.8rem', borderRadius: 'var(--radius-full)' }}
          />
        </div>
        {statuses.length > 0 && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            style={{ width: 'auto', minWidth: 170, borderRadius: 'var(--radius-full)', paddingRight: '2.2rem' }}
          >
            <option value="all">All Statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {/* ── Discovery Quick Chips ──────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <span className="text-xs text-muted font-bold" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4 }}>
          Quick filters:
        </span>
        {['Wallets', 'Phones / Tech', 'Water Bottles', 'Jackets', 'Chargers'].map(tag => (
          <button
            key={tag}
            type="button"
            className="ai-suggestion-chip"
            onClick={() => setQuery(query === tag ? '' : tag)}
            style={{
              background: query === tag ? 'var(--primary)' : undefined,
              color: query === tag ? 'white' : undefined,
              borderColor: query === tag ? 'var(--primary)' : undefined,
            }}
          >
            <span>{tag}</span>
          </button>
        ))}
        {query && (
          <button
            type="button"
            className="text-xs text-muted font-bold"
            onClick={() => setQuery('')}
            style={{ textDecoration: 'underline', cursor: 'pointer', padding: '4px 8px' }}
          >
            Clear search
          </button>
        )}
      </div>

      <Alert type="error">{error}</Alert>

      {/* ── Results Count ─────────────────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <p className="text-sm text-muted font-medium" style={{ marginBottom: 20 }}>
          Showing {filtered.length} found item{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* ── Item Grid ─────────────────────────────────────────── */}
      {loading ? (
        <SkeletonGrid count={8} />
      ) : filtered.length === 0 ? (
        <EmptyState
          svgIcon={(
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 32, height: 32 }}>
              <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><polyline points="16 3 12 7 8 3"/>
            </svg>
          )}
          title={tab === 'mine' ? "No found reports submitted yet" : "No items match your search"}
          message={
            tab === 'mine'
              ? "Found something on campus? Log it here to help reunite it with its rightful owner."
              : "Try adjusting your search keywords or clear the status filter."
          }
          action={
            canReportItems ? (
              <Link to="/found-items/new" className="btn btn-primary">
                + Report a Found Item
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="item-grid">
          {filtered.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.28), duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <ItemCard item={item} type="found" isMine={item.userId === user?.id} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
