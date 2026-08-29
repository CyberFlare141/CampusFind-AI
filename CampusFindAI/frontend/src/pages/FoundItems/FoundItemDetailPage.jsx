import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { getFoundItemById } from '../../api/foundItems';
import { createClaim, getMyClaims } from '../../api/claims';
import { useAuth } from '../../context/AuthContext';
import { Alert, ButtonSpinner, PageLoading, StatusBadge, formatDate } from '../../components/Ui';
import { publicAssetUrl } from '../../api/client';

export default function FoundItemDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const location = useLocation();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [existingClaim, setExistingClaim] = useState(null);
  const [claimNotes, setClaimNotes] = useState('');
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [claimSuccess, setClaimSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [itemData, myClaims] = await Promise.all([getFoundItemById(id), getMyClaims()]);
        if (cancelled) return;
        setItem(itemData);
        const mine = myClaims.find((c) => c.foundItemId === id);
        setExistingClaim(mine || null);
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

  async function handleClaimSubmit(e) {
    e.preventDefault();
    setClaimError('');
    setClaimSubmitting(true);
    try {
      const claim = await createClaim({ foundItemId: id, claimantNotes: claimNotes.trim() || undefined });
      setExistingClaim(claim);
      setClaimSuccess(true);
      setShowClaimForm(false);
    } catch (err) {
      setClaimError(err.message);
    } finally {
      setClaimSubmitting(false);
    }
  }

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
        <Link to="/found-items" className="btn btn-secondary">Back to Found Items</Link>
      </div>
    );
  }

  if (!item) return null;

  const isMine = item.userId === user?.id;
  const canClaimItems = user?.role !== 'Administrator';

  return (
    <div className="page-container page-container-narrow">
      <Link to="/found-items" className="back-link">&larr; Back to Found Items</Link>

      {location.state?.justCreated && (
        <Alert type="success">Thanks &mdash; your found item report was submitted.</Alert>
      )}
      {claimSuccess && (
        <Alert type="success">
          Your claim was submitted. The Security Office will review it and follow up.
        </Alert>
      )}

      <div className="card card-pad">
        <h1 style={{ marginBottom: 6, fontSize: 22 }}>{item.title}</h1>
        {isMine && <span className="badge badge-neutral" style={{ marginBottom: 14 }}>Your report</span>}
        {item.imageUrls?.length > 0 && <ImageGallery images={item.imageUrls} title={item.title} />}

        <dl className="detail-list">
          <div>
            <dt>Description</dt>
            <dd>{item.description || <span className="text-muted">No description provided.</span>}</dd>
          </div>
          <div>
            <dt>Found at</dt>
            <dd>{formatDate(item.foundAt)}</dd>
          </div>
        </dl>
      </div>

      {user?.role === 'Administrator' && <ReporterDetails item={item} />}

      {!isMine && canClaimItems && (
        <div className="card card-pad" style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 15 }}>Is this yours?</h3>

          {existingClaim ? (
            <div className="flex items-center gap-8" style={{ marginTop: 6 }}>
              <span className="text-sm text-muted">You already filed a claim on this item &mdash;</span>
              <StatusBadge status={existingClaim.status} />
              <Link to="/my-claims" className="text-sm">View my claims</Link>
            </div>
          ) : showClaimForm ? (
            <form onSubmit={handleClaimSubmit} style={{ marginTop: 10 }}>
              <Alert type="error">{claimError}</Alert>
              <div className="form-field">
                <label htmlFor="claimantNotes">Proof of ownership</label>
                <textarea
                  id="claimantNotes"
                  placeholder="Describe identifying details only the true owner would know (contents, serial number, distinguishing marks, etc.)"
                  value={claimNotes}
                  onChange={(e) => setClaimNotes(e.target.value)}
                  rows={4}
                />
                <span className="hint">Optional, but strong details help the Security Office verify your claim faster.</span>
              </div>
              <div className="flex gap-12">
                <button type="submit" className="btn btn-primary btn-sm" disabled={claimSubmitting}>
                  {claimSubmitting && <ButtonSpinner />}
                  {claimSubmitting ? 'Submitting\u2026' : 'Submit Claim'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowClaimForm(false)}
                  disabled={claimSubmitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <p className="text-muted text-sm" style={{ marginBottom: 12 }}>
                If you believe this is your lost item, file a claim and the Security Office will
                verify it with you.
              </p>
              <button type="button" className="btn btn-accent btn-sm" onClick={() => setShowClaimForm(true)}>
                Claim This Item
              </button>
            </>
          )}
        </div>
      )}
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
