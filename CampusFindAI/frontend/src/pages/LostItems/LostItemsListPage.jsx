import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getAllLostItems, getMyLostItems } from '../../api/lostItems';
import { useAuth } from '../../context/AuthContext';
import { Alert, EmptyState, SkeletonGrid, ItemCard, formatDate, StatusBadge } from '../../components/Ui';
import { publicAssetUrl } from '../../api/client';

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
    return () => { cancelled = true; };
  }, [tab]);

  const statuses = useMemo(() => {
    const set = new Set(items.map(i => i.status).filter(Boolean));
    return Array.from(set);
  }, [items]);

  const filtered = items.filter(item => {
    const matchesQuery =
      !query.trim() ||
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="page-container">
      {/* ── Header ─────────────────────────────────────────────── */}
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div>
          <span className="eyebrow">Lost Items</span>
          <h1>Lost Item Reports</h1>
          <p className="text-secondary">Browse items reported lost across campus, or file a new report.</p>
        </div>
        {canReportItems && (
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link to="/lost-items/new" className="btn btn-primary">
              + Report Lost Item
            </Link>
          </motion.div>
        )}
      </motion.div>

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <div className="tabs">
        <button
          type="button"
          className={`tab-btn ${tab === 'all' ? 'active' : ''}`}
          onClick={() => setSearchParams({ tab: 'all' })}
        >
          All Items
        </button>
        <button
          type="button"
          className={`tab-btn ${tab === 'mine' ? 'active' : ''}`}
          onClick={() => setSearchParams({ tab: 'mine' })}
        >
          My Reports
        </button>
      </div>

      {/* ── Search & filter bar ────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', fontSize: '0.9rem', pointerEvents: 'none' }}>✦</span>
          <input
            type="search"
            placeholder="Search by title or description…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search lost items"
            style={{ paddingLeft: '2.5rem', borderRadius: 'var(--radius-full)' }}
          />
        </div>
        {statuses.length > 0 && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            style={{ width: 'auto', minWidth: 160, borderRadius: 'var(--radius-full)', paddingRight: '2rem' }}
          >
            <option value="all">All statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      <Alert type="error">{error}</Alert>

      {/* ── Results count ─────────────────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
          {filtered.length} item{filtered.length !== 1 ? 's' : ''} found
        </p>
      )}

      {/* ── Content ─────────────────────────────────────────────── */}
      {loading ? (
        <SkeletonGrid count={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          svgIcon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>}
          title={tab === 'mine' ? "No lost reports yet" : 'No items match your search'}
          message={
            tab === 'mine'
              ? 'Lost something on campus? Let others know so they can help.'
              : 'Try a different search term or check back later.'
          }
          action={
            canReportItems
              ? <Link to="/lost-items/new" className="btn btn-primary btn-sm">Report a Lost Item</Link>
              : null
          }
        />
      ) : (
        <div className="item-grid">
          {filtered.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <LostItemCard item={item} isMine={item.userId === user?.id} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function LostItemCard({ item, isMine }) {
  const image = item?.imageUrls?.[0];
  return (
    <Link to={`/lost-items/${item.id}`} className="item-card">
      <div className="item-card-image">
        {image ? (
          <img src={publicAssetUrl(image)} alt={item.title} loading="lazy" />
        ) : (
          <div className="item-card-image-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ width: 36, height: 36, color: 'var(--text-muted)' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
        )}
        <span className="badge badge-warning item-card-status">
          <span className="badge-dot" />LOST
        </span>
        {isMine && (
          <span className="item-card-score" style={{ background: 'rgba(132,177,121,0.85)' }}>
            Yours
          </span>
        )}
      </div>
      <div className="item-card-body">
        <div className="item-card-title">{item.title}</div>
        <div className="item-card-meta">
          {item.description && (
            <p className="text-xs text-muted" style={{ lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {item.description}
            </p>
          )}
          <div className="item-card-meta-row">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>{formatDate(item.lostAt ?? item.createdAt)}</span>
          </div>
        </div>
      </div>
      <div className="item-card-footer">
        <StatusBadge status={item.status} />
      </div>
    </Link>
  );
}
