import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
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
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="page-container">
        <PageLoading label="Loading item\u2026" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container page-container-narrow">
        <Alert type="error">{error}</Alert>
        <Link to="/lost-items" className="btn btn-secondary">Back to Lost Items</Link>
      </div>
    );
  }

  if (!item) return null;

  const isMine = item.userId === user?.id;
  const canReportItems = user?.role !== 'Administrator';

  return (
    <div className="page-container page-container-narrow">
      <Link to="/lost-items" className="back-link">&larr; Back to Lost Items</Link>

      {location.state?.justCreated && (
        <Alert type="success">Your lost item report was submitted successfully.</Alert>
      )}

      <div className="card card-pad">
        <div className="flex items-center justify-between gap-8" style={{ marginBottom: 6 }}>
          <h1 style={{ marginBottom: 0, fontSize: 22 }}>{item.title}</h1>
          <StatusBadge status={item.status} />
        </div>

        {isMine && <span className="badge badge-neutral" style={{ marginBottom: 14 }}>Your report</span>}
        {item.imageUrls?.length > 0 && <ImageGallery images={item.imageUrls} title={item.title} />}

        <dl className="detail-list">
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
      </div>

      {canReportItems && <div className="card card-pad" style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 15 }}>Think you found this?</h3>
        <p className="text-muted text-sm" style={{ marginBottom: 12 }}>
          If you&apos;ve found an item that might match this report, log it as a found item and
          the Security Office will help connect the two.
        </p>
        <Link to="/found-items/new" className="btn btn-accent btn-sm">Report a Found Item</Link>
      </div>}

      {user?.role === 'Administrator' && <ReporterDetails item={item} />}
    </div>
  );
}

function ImageGallery({ images, title }) { return <div className="report-gallery">{images.map((image, index) => <img key={image} src={publicAssetUrl(image)} alt={`${title} ${index + 1}`} />)}</div>; }

function ReporterDetails({ item }) {
  return (
    <div className="card card-pad" style={{ marginTop: 16 }}>
      <h3 style={{ fontSize: 15 }}>Reporter details</h3>
      <dl className="detail-list">
        <div><dt>Name</dt><dd>{item.reporterName || 'Not provided'}</dd></div>
        <div><dt>Email</dt><dd>{item.reporterEmail || 'Not available'}</dd></div>
        <div><dt>Department</dt><dd>{item.reporterDepartment || 'Not provided'}</dd></div>
        <div><dt>Phone</dt><dd>{item.reporterPhone || 'Not provided'}</dd></div>
      </dl>
    </div>
  );
}
