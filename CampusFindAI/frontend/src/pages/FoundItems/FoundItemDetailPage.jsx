import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getFoundItemById } from '../../api/foundItems';
import { createClaim, getMyClaims } from '../../api/claims';
import { useAuth } from '../../context/AuthContext';
import { Alert, ButtonSpinner, PageLoading, StatusBadge, SuccessCheck, formatDate } from '../../components/Ui';
import { publicAssetUrl } from '../../api/client';

export default function FoundItemDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const location = useLocation();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);

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
        const mine = myClaims.find(c => c.foundItemId === id);
        setExistingClaim(mine || null);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
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

  if (loading) return <div className="page-container"><PageLoading label="Loading item…" /></div>;
  if (error) return (
    <div className="page-container page-container-narrow">
      <Alert type="error">{error}</Alert>
      <Link to="/found-items" className="btn btn-secondary">← Back to Found Items</Link>
    </div>
  );
  if (!item) return null;

  const isMine = item.userId === user?.id;
  const canClaimItems = user?.role !== 'Administrator';
  const images = item.imageUrls ?? [];

  return (
    <div className="page-container page-container-narrow">
      <Link to="/found-items" className="back-link">← Back to Found Items</Link>

      {location.state?.justCreated && (
        <Alert type="success">Thanks — your found item report was submitted.</Alert>
      )}
      {claimSuccess && (
        <Alert type="success">Your claim was submitted. The Security Office will review it and follow up.</Alert>
      )}

      <motion.div className="card card-pad" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
        {/* Image gallery */}
        {images.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <motion.img
              key={selectedImage}
              src={publicAssetUrl(images[selectedImage])}
              alt={`${item.title} — photo ${selectedImage + 1}`}
              style={{ width: '100%', height: 280, objectFit: 'cover', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
            />
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {images.map((img, i) => (
                  <button key={img} type="button" onClick={() => setSelectedImage(i)}
                    style={{ width: 60, height: 60, padding: 0, borderRadius: 8, border: `2px solid ${i === selectedImage ? 'var(--primary)' : 'var(--border)'}`, overflow: 'hidden', cursor: 'pointer', background: 'none', transition: 'border-color var(--transition-fast)', flexShrink: 0 }}
                    aria-label={`View photo ${i + 1}`}>
                    <img src={publicAssetUrl(img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: 6 }}>{item.title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <StatusBadge status={item.status} />
              <span className="badge badge-success"><span className="badge-dot" />FOUND</span>
              {isMine && <span className="badge badge-primary">Your report</span>}
            </div>
          </div>
        </div>

        <dl className="detail-list" style={{ marginBottom: 24 }}>
          <div><dt>Description</dt><dd>{item.description || <span className="text-muted">No description provided.</span>}</dd></div>
          <div><dt>Found at</dt><dd>{formatDate(item.foundAt)}</dd></div>
        </dl>

        {/* Claim section */}
        {!isMine && canClaimItems && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24 }}>
            <h3 style={{ marginBottom: 6, fontSize: '1.1rem' }}>Is this yours?</h3>

            {existingClaim ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '14px 16px', background: 'rgba(199,234,187,0.35)', borderRadius: 'var(--radius-md)' }}>
                <span className="text-sm text-muted">You already filed a claim on this item —</span>
                <StatusBadge status={existingClaim.status} />
                <Link to="/my-claims" className="text-sm font-semibold" style={{ color: 'var(--primary-deep)' }}>View my claims →</Link>
              </div>
            ) : showClaimForm ? (
              <motion.form
                onSubmit={handleClaimSubmit}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                style={{ display: 'grid', gap: 16 }}
              >
                <Alert type="error">{claimError}</Alert>
                <div style={{ padding: '12px 16px', background: 'rgba(29,78,216,0.06)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--info)' }}>
                  <p style={{ fontSize: '0.875rem', color: 'var(--info)', fontWeight: 500 }}>
                    ✦ Provide details that only the true owner would know. The Security Office will use this to verify your claim.
                  </p>
                </div>
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
                <div style={{ display: 'flex', gap: 12 }}>
                  <motion.button type="submit" className="btn btn-primary" disabled={claimSubmitting} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    {claimSubmitting && <ButtonSpinner />}
                    {claimSubmitting ? 'Submitting…' : 'Submit Claim'}
                  </motion.button>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowClaimForm(false)} disabled={claimSubmitting}>Cancel</button>
                </div>
              </motion.form>
            ) : (
              <div>
                <p className="text-muted text-sm" style={{ marginBottom: 14 }}>
                  If you believe this is your lost item, file a claim and the Security Office will verify it with you.
                </p>
                <motion.button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowClaimForm(true)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  ⚖️ Claim This Item
                </motion.button>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {user?.role === 'Administrator' && (
        <motion.div className="card card-pad" style={{ marginTop: 16 }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
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
