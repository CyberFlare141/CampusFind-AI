import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getFoundItemById } from '../../api/foundItems';
import { createClaim, getMyClaims } from '../../api/claims';
import { useAuth } from '../../context/AuthContext';
import { Alert, ButtonSpinner, PageLoading, StatusBadge, formatDate } from '../../components/Ui';
import { publicAssetUrl } from '../../api/client';
import VerificationModal from '../../components/VerificationModal';

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
  const [showVerificationModal, setShowVerificationModal] = useState(false);

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

        const params = new URLSearchParams(location.search);
        if (params.get('claim') === '1' && !mine) {
          setShowClaimForm(true);
        }
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
      setShowVerificationModal(true);
    } catch (err) {
      setClaimError(err.message);
    } finally {
      setClaimSubmitting(false);
    }
  }

  if (loading) return <div className="page-container-detail"><PageLoading label="Loading item details…" /></div>;
  if (error) return (
    <div className="page-container-detail">
      <Alert type="error">{error}</Alert>
      <Link to="/found-items" className="btn btn-secondary">← Back to Found Items</Link>
    </div>
  );
  if (!item) return null;

  const isMine = item.userId === user?.id;
  const canClaimItems = user?.role !== 'Administrator';
  const images = item.imageUrls ?? [];

  return (
    <div className="page-container-detail">
      <Link to="/found-items" className="back-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
        </svg>
        Back to Found Items
      </Link>

      {location.state?.justCreated && (
        <Alert type="success">Thank you — your found item report has been logged in the campus directory.</Alert>
      )}
      {claimSuccess && (
        <Alert type="success">Your ownership claim has been submitted. Campus Security will verify the details and notify you.</Alert>
      )}

      <motion.div
        className="card card-pad-lg"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
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
              <span className="badge badge-success">
                <span className="badge-dot" />FOUND
              </span>
              {isMine && <span className="badge badge-primary">Your report</span>}
            </div>
          </div>
        </div>

        {/* ── Details ────────────────────────────────────────────── */}
        <dl className="detail-list" style={{ marginBottom: 28 }}>
          <div>
            <dt>Description</dt>
            <dd style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
              {item.description || <span className="text-muted">No additional description provided.</span>}
            </dd>
          </div>
          {item.location && (
            <div>
              <dt>Found Location</dt>
              <dd style={{ fontWeight: 600 }}>{item.location}</dd>
            </div>
          )}
          <div>
            <dt>Date Found</dt>
            <dd>{formatDate(item.foundAt)}</dd>
          </div>
          <div>
            <dt>Logged On</dt>
            <dd>{formatDate(item.createdAt)}</dd>
          </div>
        </dl>

        {/* ── Claim Section ───────────────────────────────────────── */}
        {!isMine && canClaimItems && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 28 }}>
            <h3 style={{ marginBottom: 8, fontSize: '1.15rem' }}>Is this item yours?</h3>

            {existingClaim ? (
              <div style={{
                display: 'grid',
                gap: 14,
                padding: '18px 20px',
                background: 'var(--surface-card-alt)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--border)',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  flexWrap: 'wrap',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="text-sm font-semibold text-secondary">Your claim status:</span>
                    <StatusBadge status={existingClaim.status} />
                  </div>
                  <Link to="/my-claims" className="text-sm font-semibold" style={{ color: 'var(--primary-deep)' }}>
                    View claim progress →
                  </Link>
                </div>

                {existingClaim.status === 'Pending' && (
                  existingClaim.verificationStatus === 'Completed' ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'var(--verify-surface, #C7EABB)',
                      color: '#2d5a27',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      border: '1px solid #84B179',
                    }}>
                      <span>✓</span> Ownership questions answered. Campus Security is reviewing your claim.
                    </div>
                  ) : existingClaim.verificationStatus === 'Locked' ? (
                    <div style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'var(--danger-bg)',
                      color: 'var(--danger)',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                    }}>
                      ⚠️ Verification attempts reached. Manual verification required at Security Desk.
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: 'var(--verify-bg, #E8F5BD)',
                      border: '1px solid var(--verify-primary, #84B179)',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}>
                      <div style={{ fontSize: '0.85rem', color: '#1F2937' }}>
                        <strong>🛡️ Action Required:</strong> Answer 3 quick ownership questions to verify your claim.
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => setShowVerificationModal(true)}
                        style={{
                          background: 'var(--verify-primary, #84B179)',
                          borderColor: 'var(--verify-primary, #84B179)',
                          color: '#1F2937',
                          fontWeight: 700,
                        }}
                      >
                        Start Verification →
                      </button>
                    </div>
                  )
                )}
              </div>
            ) : showClaimForm ? (
              <motion.form
                onSubmit={handleClaimSubmit}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.35 }}
                style={{ display: 'grid', gap: 18 }}
              >
                <Alert type="error">{claimError}</Alert>
                <div style={{
                  padding: '14px 18px',
                  background: 'rgba(143, 162, 138, 0.14)',
                  borderRadius: 'var(--radius-md)',
                  borderLeft: '4px solid var(--primary)',
                }}>
                  <p style={{ fontSize: '0.9rem', color: 'var(--primary-deep)', fontWeight: 600 }}>
                    ✦ Provide specific distinguishing details (e.g. serial numbers, stickers, contents) so Campus Security can verify your ownership.
                  </p>
                </div>
                <div className="form-field">
                  <label htmlFor="claimantNotes">Proof of Ownership / Distinguishing Details</label>
                  <textarea
                    id="claimantNotes"
                    placeholder="Describe specific details only the rightful owner would know (e.g. exact contents, lock screen picture, engraved initials, receipts, etc.)"
                    value={claimNotes}
                    onChange={(e) => setClaimNotes(e.target.value)}
                    rows={4}
                  />
                  <span className="hint">Clear details expedite Security verification and return.</span>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <motion.button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    disabled={claimSubmitting}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {claimSubmitting && <ButtonSpinner />}
                    {claimSubmitting ? 'Submitting…' : 'Submit Ownership Claim'}
                  </motion.button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setShowClaimForm(false)}
                    disabled={claimSubmitting}
                  >
                    Cancel
                  </button>
                </div>
              </motion.form>
            ) : (
              <div>
                <p className="text-secondary text-sm" style={{ marginBottom: 16, maxWidth: 580 }}>
                  If you lost this item on campus, submit an ownership claim with identifying proof. Campus Security will verify your claim.
                </p>
                <motion.button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={() => setShowClaimForm(true)}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                >
                  ⚖️ Claim This Item
                </motion.button>
              </div>
            )}
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
          <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>Finder Details</h3>
          <dl className="detail-list">
            <div><dt>Name</dt><dd>{item.reporterName || 'Not provided'}</dd></div>
            <div><dt>Email</dt><dd>{item.reporterEmail || 'Not available'}</dd></div>
            <div><dt>Department</dt><dd>{item.reporterDepartment || 'Not provided'}</dd></div>
            <div><dt>Phone</dt><dd>{item.reporterPhone || 'Not provided'}</dd></div>
          </dl>
        </motion.div>
      )}

      {/* ── Ownership Verification Modal ────────────────────── */}
      <VerificationModal
        claim={existingClaim}
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onComplete={() => {
          getMyClaims().then(claims => {
            const mine = claims.find(c => c.foundItemId === id);
            if (mine) setExistingClaim(mine);
          });
        }}
      />
    </div>
  );
}
