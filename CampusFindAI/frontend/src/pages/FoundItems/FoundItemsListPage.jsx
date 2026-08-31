import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getAllFoundItems, getMyFoundItems } from '../../api/foundItems';
import { useAuth } from '../../context/AuthContext';
import { Alert, EmptyState, SkeletonGrid, StatusBadge, formatDate } from '../../components/Ui';
import { publicAssetUrl } from '../../api/client';

export default function FoundItemsListPage() {
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
    const matchesQuery = !query.trim() ||
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="page-container">
      <motion.div className="page-header" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
        <div>
          <span className="eyebrow">Found Items</span>
          <h1>Found Item Reports</h1>
          <p className="text-secondary">Browse items found across campus — is one of these yours?</p>
        </div>
        {canReportItems && (
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link to="/found-items/new" className="btn btn-primary">+ Report Found Item</Link>
          </motion.div>
        )}
      </motion.div>

      <div className="tabs">
        <button type="button" className={`tab-btn ${tab === 'all' ? 'active' : ''}`} onClick={() => setSearchParams({ tab: 'all' })}>All Found Items</button>
        <button type="button" className={`tab-btn ${tab === 'mine' ? 'active' : ''}`} onClick={() => setSearchParams({ tab: 'mine' })}>My Reports</button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', fontSize: '0.9rem', pointerEvents: 'none' }}>✦</span>
          <input type="search" placeholder="Search by title or description…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search found items" style={{ paddingLeft: '2.5rem', borderRadius: 'var(--radius-full)' }} />
        </div>
        {statuses.length > 0 && (
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status" style={{ width: 'auto', minWidth: 160, borderRadius: 'var(--radius-full)', paddingRight: '2rem' }}>
            <option value="all">All statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      <Alert type="error">{error}</Alert>

      {!loading && filtered.length > 0 && (
        <p className="text-sm text-muted" style={{ marginBottom: 16 }}>{filtered.length} item{filtered.length !== 1 ? 's' : ''} found</p>
      )}

      {loading ? (
        <SkeletonGrid count={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          svgIcon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><polyline points="16 3 12 7 8 3"/></svg>}
          title={tab === 'mine' ? "No found reports yet" : 'No items match your search'}
          message={tab === 'mine' ? 'Found something on campus? Help reunite it with its owner.' : 'Try a different search term or check back later.'}
          action={canReportItems ? <Link to="/found-items/new" className="btn btn-primary btn-sm">Report a Found Item</Link> : null}
        />
      ) : (
        <div className="item-grid">
          {filtered.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
              <FoundItemCard item={item} isMine={item.userId === user?.id} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function FoundItemCard({ item, isMine }) {
  const image = item?.imageUrls?.[0];
  return (
    <Link to={`/found-items/${item.id}`} className="item-card">
      <div className="item-card-image">
      {image ? <img src={publicAssetUrl(image)} alt={item.title} loading="lazy" /> : (
        <div className="item-card-image-placeholder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ width: 36, height: 36, color: 'var(--text-muted)' }}>
            <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><polyline points="16 3 12 7 8 3"/>
          </svg>
        </div>
      )}
        <span className="badge badge-success item-card-status"><span className="badge-dot" />FOUND</span>
        {isMine && <span className="item-card-score" style={{ background: 'rgba(132,177,121,0.85)' }}>Yours</span>}
      </div>
      <div className="item-card-body">
        <div className="item-card-title">{item.title}</div>
        <div className="item-card-meta">
          {item.description && <p className="text-xs text-muted" style={{ lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.description}</p>}
          <div className="item-card-meta-row">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>{formatDate(item.foundAt ?? item.createdAt)}</span>
          </div>
        </div>
      </div>
      <div className="item-card-footer"><StatusBadge status={item.status} /></div>
    </Link>
  );
}
