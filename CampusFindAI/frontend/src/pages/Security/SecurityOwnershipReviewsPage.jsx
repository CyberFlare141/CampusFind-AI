import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { getApprovedClaims, getClaimReview } from '../../api/claims';
import {
  Alert,
  EmptyState,
  PageLoading,
  StatusBadge,
  formatDate,
  FadeImage,
} from '../../components/Ui';
import { publicAssetUrl } from '../../api/client';

export default function SecurityOwnershipReviewsPage() {
  const [approvedClaims, setApprovedClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedClaimId, setExpandedClaimId] = useState(null);
  const [evidenceMap, setEvidenceMap] = useState({});
  const [loadingEvidenceId, setLoadingEvidenceId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getApprovedClaims();
      // Ensure only unique items are displayed (if an item had multiple claims, only approved one is present)
      const list = Array.isArray(data) ? data : [];
      const unique = [];
      const seen = new Set();
      for (const item of list) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          unique.push(item);
        }
      }
      setApprovedClaims(unique);
    } catch (e) {
      setError(e.message || 'Failed to load approved ownership records.');
      setApprovedClaims([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function toggleEvidence(claimId) {
    if (expandedClaimId === claimId) {
      setExpandedClaimId(null);
      return;
    }

    if (evidenceMap[claimId]) {
      setExpandedClaimId(claimId);
      return;
    }

    setLoadingEvidenceId(claimId);
    try {
      const evidence = await getClaimReview(claimId);
      setEvidenceMap(prev => ({ ...prev, [claimId]: evidence }));
      setExpandedClaimId(claimId);
    } catch (err) {
      setError(err.message || 'Failed to load detailed evidence.');
    } finally {
      setLoadingEvidenceId(null);
    }
  }

  const filteredClaims = useMemo(() => {
    if (!searchQuery.trim()) return approvedClaims;
    const q = searchQuery.toLowerCase();
    return approvedClaims.filter(
      c =>
        (c.foundItemTitle && c.foundItemTitle.toLowerCase().includes(q)) ||
        (c.claimantEmail && c.claimantEmail.toLowerCase().includes(q)) ||
        (c.decisionNotes && c.decisionNotes.toLowerCase().includes(q)) ||
        (c.claimantNotes && c.claimantNotes.toLowerCase().includes(q))
    );
  }, [approvedClaims, searchQuery]);

  if (loading) {
    return <PageLoading label="Loading approved ownership records…" />;
  }

  return (
    <div className="page-container-wide security-ownership-page">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <span className="eyebrow">Security Desk Directory</span>
            <h1>Approved Ownership Reference</h1>
            <p className="text-secondary">
              Read-only master registry of verified item ownerships and completed handovers across campus.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadData}
            disabled={loading}
          >
            ↻ Refresh Records
          </button>
        </div>
      </motion.div>

      {/* ── Search & Filter Bar ───────────────────────────────── */}
      <div className="security-ownership-filter" style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="search"
            placeholder="Search by item title, claimant email, or notes…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}
          />
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 16 }}>
          <Alert type="error">{error}</Alert>
        </div>
      )}

      {filteredClaims.length === 0 ? (
        <EmptyState
          svgIcon={
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: 32, height: 32 }}
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          }
          title={searchQuery ? 'No matching records found' : 'No approved ownership records yet'}
          message={
            searchQuery
              ? 'Try modifying your search keywords.'
              : 'When claims are approved by Security Officers, verified ownership details will appear here as reference.'
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredClaims.map((claim, i) => {
            const primaryImage = claim.imageUrls && claim.imageUrls.length > 0 ? claim.imageUrls[0] : null;
            const isExpanded = expandedClaimId === claim.id;
            const evidence = evidenceMap[claim.id];
            const isEvidenceLoading = loadingEvidenceId === claim.id;

            return (
              <motion.article
                key={claim.id}
                className="card card-pad-lg"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.3 }}
              >
                {/* ── Top Summary Row ───────────────────────────────── */}
                <div className="security-ownership-summary"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap',
                    marginBottom: 14,
                  }}
                >
                  <div className="security-ownership-summary-details" style={{ display: 'flex', gap: 14, alignItems: 'center', flex: 1, minWidth: 0 }}>
                    {primaryImage && (
                      <div
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          flexShrink: 0,
                          border: '1px solid var(--border)',
                        }}
                      >
                        <FadeImage src={publicAssetUrl(primaryImage)} alt={claim.foundItemTitle} />
                      </div>
                    )}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span className="badge badge-info" style={{ fontSize: '0.74rem' }}>
                          Claim #{claim.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span className="badge badge-success" style={{ fontSize: '0.74rem' }}>
                          ✓ Verified Ownership
                        </span>
                      </div>
                      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '2px 0 4px' }}>
                        {claim.foundItemTitle}
                      </h2>
                      <p className="text-sm text-secondary" style={{ margin: 0 }}>
                        Approved Owner: <strong style={{ color: 'var(--text-primary)' }}>{claim.claimantEmail}</strong>
                        {' · '}
                        Approved on {formatDate(claim.reviewedAt || claim.createdAt)}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={claim.status} />
                </div>

                {/* ── Item & Decision Info Grid ─────────────────────── */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
                    gap: 12,
                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{
                      padding: '12px 14px',
                      background: 'var(--surface-card-alt)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <span
                      style={{
                        display: 'block',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.07em',
                        color: 'var(--text-secondary)',
                        marginBottom: 4,
                      }}
                    >
                      Approved Claimant Proof Notes
                    </span>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                      {claim.claimantNotes || 'No specific proof notes provided.'}
                    </p>
                  </div>

                  <div
                    style={{
                      padding: '12px 14px',
                      background: 'rgba(34, 197, 94, 0.06)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(34, 197, 94, 0.25)',
                    }}
                  >
                    <span
                      style={{
                        display: 'block',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.07em',
                        color: 'var(--success, #22c55e)',
                        marginBottom: 4,
                      }}
                    >
                      Officer Approval &amp; Handover Status
                    </span>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                      {claim.status === 'Returned' ? (
                        <>
                          <strong>Item Handed Over:</strong> Returned {claim.handedOverAt ? `on ${formatDate(claim.handedOverAt)}` : ''}
                          {claim.handoverNotes && ` (${claim.handoverNotes})`}
                        </>
                      ) : (
                        <>
                          <strong>Approved for Handover:</strong> Student has QR code for in-person desk collection.
                          {claim.decisionNotes && ` Notes: ${claim.decisionNotes}`}
                        </>
                      )}
                    </p>
                    {claim.reviewedByEmail && (
                      <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                        Reviewed by {claim.reviewedByEmail}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Evidence Inspection Toggle ────────────────────── */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => toggleEvidence(claim.id)}
                    disabled={isEvidenceLoading}
                  >
                    {isEvidenceLoading
                      ? 'Loading Evidence…'
                      : isExpanded
                      ? 'Hide Stakeholder Profiles & Details'
                      : 'Inspect Stakeholder Profiles & Details'}
                  </button>
                </div>

                {/* ── Expanded Evidence Drawer ──────────────────────── */}
                {isExpanded && evidence && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    style={{
                      marginTop: 14,
                      paddingTop: 14,
                      borderTop: '1px solid var(--border)',
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                        gap: 14,
                        marginBottom: 12,
                      }}
                    >
                      <section
                        style={{
                          padding: 12,
                          background: 'var(--surface-card-alt)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <h4
                          style={{
                            fontSize: '0.78rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            color: 'var(--text-secondary)',
                            margin: '0 0 8px 0',
                          }}
                        >
                          Claimant Student Profile
                        </h4>
                        <dl style={{ display: 'grid', gap: 4, margin: 0, fontSize: '0.86rem' }}>
                          <div>
                            <dt style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>NAME</dt>
                            <dd style={{ margin: 0, fontWeight: 600 }}>
                              {evidence.claimant?.fullName || 'Not provided'}
                            </dd>
                          </div>
                          <div>
                            <dt style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>EMAIL</dt>
                            <dd style={{ margin: 0, fontWeight: 600 }}>{evidence.claimant?.email}</dd>
                          </div>
                          {evidence.claimant?.studentId && (
                            <div>
                              <dt style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>STUDENT ID</dt>
                              <dd style={{ margin: 0, fontWeight: 600 }}>{evidence.claimant.studentId}</dd>
                            </div>
                          )}
                          {evidence.claimant?.department && (
                            <div>
                              <dt style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>DEPARTMENT</dt>
                              <dd style={{ margin: 0, fontWeight: 600 }}>{evidence.claimant.department}</dd>
                            </div>
                          )}
                        </dl>
                      </section>

                      <section
                        style={{
                          padding: 12,
                          background: 'var(--surface-card-alt)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <h4
                          style={{
                            fontSize: '0.78rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            color: 'var(--text-secondary)',
                            margin: '0 0 8px 0',
                          }}
                        >
                          Finder / Reporter Profile
                        </h4>
                        <dl style={{ display: 'grid', gap: 4, margin: 0, fontSize: '0.86rem' }}>
                          <div>
                            <dt style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>NAME</dt>
                            <dd style={{ margin: 0, fontWeight: 600 }}>
                              {evidence.reporter?.fullName || 'Campus Member'}
                            </dd>
                          </div>
                          <div>
                            <dt style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>EMAIL</dt>
                            <dd style={{ margin: 0, fontWeight: 600 }}>{evidence.reporter?.email}</dd>
                          </div>
                          {evidence.reporter?.department && (
                            <div>
                              <dt style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>DEPARTMENT</dt>
                              <dd style={{ margin: 0, fontWeight: 600 }}>{evidence.reporter.department}</dd>
                            </div>
                          )}
                        </dl>
                      </section>
                    </div>

                    {evidence.imageUrls && evidence.imageUrls.length > 0 && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                        {evidence.imageUrls.map((url, imgIdx) => (
                          <a key={url} href={publicAssetUrl(url)} target="_blank" rel="noreferrer">
                            <img
                              src={publicAssetUrl(url)}
                              alt={`Item reference ${imgIdx + 1}`}
                              style={{
                                width: 64,
                                height: 64,
                                objectFit: 'cover',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border)',
                              }}
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
}
