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

  if (loading) return <div className="page-container-detail"><PageLoading label="Loading item details…" /></div>;

  if (error) return (
    <div className="page-container-detail">
      <Alert type="error">{error}</Alert>
      <Link to="/lost-items" className="btn btn-secondary">← Back to Lost Items</Link>
    </div>
  );

  if (!item) return null;

  const isMine = item.userId === user?.id;
  const canReportItems = user?.role !== 'Administrator';
  const images = item.imageUrls ?? [];

  return (
    <div className="page-container-detail">
      <Link to="/lost-items" className="back-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
        </svg>
        Back to Lost Items
      </Link>

      {location.state?.justCreated && (
        <Alert type="success">Your lost item report has been submitted. CampusFind AI is now scanning for matches.</Alert>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="card card-pad-lg"
      >
        {/* ── Photo Gallery ─────────────────────────────────────── */}
        {images.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{
              width: '100%',
              height: 340,
              borderRadius: 'var(--radius-xl)',
              overflow: 'hidden',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <motion.img
                key={selectedImage}
                src={publicAssetUrl(images[selectedImage])}
                alt={`${item.title} — photo ${selectedImage + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            </div>
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                {images.map((img, i) => (
                  <button
                    key={img}
                    type="button"
                    onClick={() => setSelectedImage(i)}
                    style={{
                      width: 68, height: 68, padding: 0, borderRadius: 'var(--radius-md)',
                      border: `2px solid ${i === selectedImage ? 'var(--primary)' : 'var(--border)'}`,
                      overflow: 'hidden', cursor: 'pointer', background: 'none',
                      transition: 'border-color var(--transition-fast), transform var(--transition-fast)',
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
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', marginBottom: 8 }}>{item.title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <StatusBadge status={item.status} />
              <span className="badge badge-warning">
                <span className="badge-dot" />LOST
              </span>
              {isMine && <span className="badge badge-primary">Your report</span>}
            </div>
          </div>
        </div>

        {/* ── Detail List ─────────────────────────────────────────── */}
        <dl className="detail-list" style={{ marginBottom: 28 }}>
          <div>
            <dt>Description</dt>
            <dd style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
              {item.description || <span className="text-muted">No additional description provided.</span>}
            </dd>
          </div>
          {item.locationDetails && (
            <div>
              <dt>Reported Location</dt>
              <dd style={{ fontWeight: 600 }}>{item.locationDetails}</dd>
            </div>
          )}
          {!item.locationDetails && (item.buildingName || item.floorName || item.locationName || item.location) && (
            <div><dt>Last Seen Location</dt><dd style={{ fontWeight: 600 }}>{[item.buildingName, item.floorName, item.locationName || item.location].filter(Boolean).join(' • ')}</dd></div>
          )}
          {item.categoryName && <div><dt>Category</dt><dd style={{ fontWeight: 600 }}>{item.categoryName}</dd></div>}
          <div>
            <dt>Date Lost</dt>
            <dd>{formatDate(item.lostAt)}</dd>
          </div>
          <div>
            <dt>Reported On</dt>
            <dd>{formatDate(item.createdAt)}</dd>
          </div>
        </dl>

        {/* ── Call to Action ───────────────────────────────────────── */}
        {canReportItems && !isMine && (
          <div style={{
            padding: '24px',
            background: 'var(--surface-card-alt)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border)',
            marginTop: 8,
          }}>
            <h3 style={{ marginBottom: 6, fontSize: '1.1rem' }}>Found something matching this?</h3>
            <p className="text-sm text-secondary" style={{ marginBottom: 16, maxWidth: 580 }}>
              If you found an item that might correspond to this report, please log it in the campus found database. Campus Security will help verify and facilitate the return.
            </p>
            <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }} style={{ display: 'inline-block' }}>
              <Link to="/found-items/new" className="btn btn-primary">
                📦 Report Found Item
              </Link>
            </motion.div>
          </div>
        )}
      </motion.div>

      {/* ── Administrator: Reporter Contact Card ─────────────────── */}
      {user?.role === 'Administrator' && (
        <motion.div
          className="card card-pad"
          style={{ marginTop: 20 }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>Reporter Details</h3>
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
