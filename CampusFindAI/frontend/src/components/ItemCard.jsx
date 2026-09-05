import { Link } from 'react-router-dom';
import { StatusBadge, formatDate } from './Ui';
import { publicAssetUrl } from '../api/client';

/**
 * @param {'lost'|'found'} kind
 */
export default function ItemCard({ kind, item, mine }) {
  const isLost = kind === 'lost';
  const statusLabel = isLost ? 'LOST' : 'FOUND';
  const statusCls   = isLost ? 'badge-warning' : 'badge-success';
  const dateValue   = isLost ? item.lostAt : item.foundAt;
  const basePath    = isLost ? '/lost-items' : '/found-items';
  const image       = item.imageUrls?.[0];
  const canClaim    = !isLost && !mine && item.status === 'Available';
  const linkTo      = `${basePath}/${item.id}${canClaim ? '?claim=1' : ''}`;

  return (
    <Link to={linkTo} className="item-card" aria-label={item.title}>
      <div className="item-card-image">
        {image ? (
          <img src={publicAssetUrl(image)} alt={item.title} loading="lazy" />
        ) : (
          <div className="item-card-image-placeholder">
            {isLost ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 36, height: 36, color: 'var(--text-muted)' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 36, height: 36, color: 'var(--text-muted)' }}>
                <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><polyline points="16 3 12 7 8 3"/>
              </svg>
            )}
          </div>
        )}
        <span className={`badge ${statusCls} item-card-status`}>
          <span className="badge-dot" aria-hidden="true" />
          {statusLabel}
        </span>
        {mine && (
          <span className="item-card-score" style={{ background: 'rgba(74, 99, 71, 0.9)' }}>
            Yours
          </span>
        )}
      </div>

      <div className="item-card-body">
        <div className="item-card-title">{item.title}</div>
        {item.description && (
          <p className="text-xs text-muted" style={{ lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {item.description}
          </p>
        )}
        <div className="item-card-meta">
          {(item.locationDetails || item.location) && (
            <div className="item-card-meta-row">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>{item.locationDetails || item.location}</span>
            </div>
          )}
          <div className="item-card-meta-row">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>{formatDate(dateValue ?? item.createdAt)}</span>
          </div>
        </div>
      </div>

      <div className="item-card-footer">
        <StatusBadge status={item.status} />
        {canClaim ? (
          <span
            className="btn btn-xs btn-primary"
            style={{
              padding: '4px 10px',
              fontSize: '0.74rem',
              fontWeight: 700,
              background: 'var(--primary)',
              color: 'white',
              borderRadius: 'var(--radius-full)',
              boxShadow: 'var(--shadow-xs)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            ⚖️ Claim Item →
          </span>
        ) : (
          <span className="text-xs font-semibold" style={{ color: 'var(--primary-deep)' }}>Details →</span>
        )}
      </div>
    </Link>
  );
}
