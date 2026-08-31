import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getLostItemById } from '../../api/lostItems';
import { useAuth } from '../../context/AuthContext';
import { Alert, PageLoading, StatusBadge, formatDate } from '../../components/Ui';
import { publicAssetUrl } from '../../api/client';

export default function LostItemDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const location = useLocation();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await getLostItemById(id);
        if (!cancelled) setItem(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <div className="page-container"><PageLoading label="Loading item…" /></div>;

  if (error) return (
    <div className="page-container page-container-narrow">
      <Alert type="error">{error}</Alert>
      <Link to="/lost-items" className="btn btn-secondary">← Back to Lost Items</Link>
    </div>
  );

  if (!item) return null;

  const isMine = item.userId === user?.id;
  const canReportItems = user?.role !== 'Administrator';
  const images = item.imageUrls ?? [];

  return (
    <div className="page-container page-container-narrow">
      <Link to="/lost-items" className="back-link">← Back to Lost Items</Link>

      {location.state?.justCreated && (
        <Alert type="success">Your lost item report was submitted successfully.</Alert>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="card card-pad"
      >
        {/* ── Image gallery ─────────────────────────────────────── */}
        {images.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <motion.img
              key={selectedImage}
              src={publicAssetUrl(images[selectedImage])}
              alt={`${item.title} — photo ${selectedImage + 1}`}
              style={{ width: '100%', height: 280, objectFit: 'cover', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {images.map((img, i) => (
                  <button
                    key={img}
                    type="button"
                    onClick={() => setSelectedImage(i)}
                    style={{
                      width: 60, height: 60, padding: 0, borderRadius: 8,
                      border: `2px solid ${i === selectedImage ? 'var(--primary)' : 'var(--border)'}`,
                      overflow: 'hidden', cursor: 'pointer', background: 'none',
                      transition: 'border-color var(--transition-fast)',
                      flexShrink: 0,
                    }}
                    aria-label={`View photo ${i + 1}`}
                  >
                    <img src={publicAssetUrl(img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Header ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: 6 }}>{item.title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <StatusBadge status={item.status} />
              <span className="badge badge-warning"><span className="badge-dot" />LOST</span>
              {isMine && <span className="badge badge-primary">Your report</span>}
            </div>
          </div>
        </div>

        {/* ── Detail list ─────────────────────────────────────────── */}
        <dl className="detail-list" style={{ marginBottom: 24 }}>
          <div>
            <dt>Description</dt>
            <dd>{item.description || <span className="text-muted">No description provided.</span>}</dd>
          </div>
          <div>
            <dt>Lost at</dt>
            <dd>{formatDate(item.lostAt)}</dd>
          </div>
          <div>
            <dt>Reported on</dt>
            <dd>{formatDate(item.createdAt)}</dd>
          </div>
        </dl>

        {/* ── CTA ─────────────────────────────────────────────────── */}
        {canReportItems && !isMine && (
          <div style={{ padding: '20px', background: 'rgba(199,234,187,0.35)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
            <h3 style={{ marginBottom: 6, fontSize: '1rem' }}>Think you found this?</h3>
            <p className="text-sm text-muted" style={{ marginBottom: 14 }}>
              If you've found an item that might match this report, log it as a found item and the Security Office will help connect the two.
            </p>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ display: 'inline-block' }}>
              <Link to="/found-items/new" className="btn btn-primary btn-sm">
                📦 Report a Found Item
              </Link>
            </motion.div>
          </div>
        )}
      </motion.div>

      {/* ── Admin: reporter details ─────────────────────────────── */}
      {user?.role === 'Administrator' && (
        <motion.div
          className="card card-pad"
          style={{ marginTop: 16 }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 style={{ fontSize: '0.9rem', marginBottom: 16 }}>Reporter details</h3>
          <dl className="detail-list">
            <div><dt>Name</dt><dd>{item.reporterName || 'Not provided'}</dd></div>
            <div><dt>Email</dt><dd>{item.reporterEmail || 'Not available'}</dd></div>
            <div><dt>Department</dt><dd>{item.reporterDepartment || 'Not provided'}</dd></div>
            <div><dt>Phone</dt><dd>{item.reporterPhone || 'Not provided'}</dd></div>
          </dl>
        </motion.div>
      )}
    </div>
  );
}
