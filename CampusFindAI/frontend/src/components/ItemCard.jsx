import { Link } from 'react-router-dom';
import { StatusBadge, formatDate } from './Ui';
import { publicAssetUrl } from '../api/client';

/**
 * @param {'lost'|'found'} kind
 */
export default function ItemCard({ kind, item, mine }) {
  const dateLabel = kind === 'lost' ? 'Lost' : 'Found';
  const dateValue = kind === 'lost' ? item.lostAt : item.foundAt;
  const basePath = kind === 'lost' ? '/lost-items' : '/found-items';

  return (
    <Link to={`${basePath}/${item.id}`} className="card card-hover card-pad item-card">
      {item.imageUrls?.[0] && <img className="report-thumbnail" src={publicAssetUrl(item.imageUrls[0])} alt="" />}
      <div className="flex items-center justify-between gap-8" style={{ marginBottom: 8 }}>
        <h3 style={{ fontSize: 16, margin: 0 }}>{item.title}</h3>
        {kind === 'lost' && item.status && <StatusBadge status={item.status} />}
      </div>

      {item.description && (
        <p className="text-muted text-sm item-card-desc">{item.description}</p>
      )}

      <div className="item-card-meta">
        <span>{dateLabel}: {formatDate(dateValue)}</span>
        {mine && <span className="badge badge-neutral">Your report</span>}
      </div>
    </Link>
  );
}
