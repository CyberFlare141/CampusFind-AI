// CampusFind AI — Premium UI Primitives
// Small, reusable components used across all pages.

import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

/* ── Page Loading ────────────────────────────────────────────── */
export function PageLoading({ label = 'Loading…' }) {
  return (
    <div className="page-loading">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        style={{ display: 'inline-block' }}
      >
        <span className="spinner spinner-primary spinner-lg" aria-hidden="true" />
      </motion.div>
      <span className="text-muted text-sm">{label}</span>
    </div>
  );
}

/* ── Button Spinner (for form buttons) ───────────────────────── */
export function ButtonSpinner() {
  return <span className="spinner" aria-hidden="true" />;
}

/* ── Skeleton components ─────────────────────────────────────── */
export function SkeletonCard() {
  return (
    <div className="card card-pad">
      <div className="skeleton skeleton-img" style={{ height: 180, marginBottom: 16 }} />
      <div className="skeleton skeleton-title" style={{ width: '70%' }} />
      <div className="skeleton skeleton-text" style={{ width: '90%' }} />
      <div className="skeleton skeleton-text" style={{ width: '55%' }} />
    </div>
  );
}

export function SkeletonText({ width = '100%', height = 14, style }) {
  return <div className="skeleton" style={{ width, height, borderRadius: 4, ...style }} />;
}

export function SkeletonGrid({ count = 6 }) {
  return (
    <div className="item-grid">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.05 }}
        >
          <SkeletonCard />
        </motion.div>
      ))}
    </div>
  );
}

/* ── Empty State ─────────────────────────────────────────────── */
export function EmptyState({ icon = null, svgIcon = null, title, message, action }) {
  return (
    <motion.div
      className="empty-state"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Icon container */}
      <div style={{
        width: 64, height: 64,
        borderRadius: 'var(--radius-xl)',
        background: 'rgba(143, 162, 138, 0.12)',
        border: '1.5px dashed rgba(143, 162, 138, 0.35)',
        display: 'grid',
        placeItems: 'center',
        marginBottom: 'var(--space-4)',
        color: 'var(--text-muted)',
        fontSize: svgIcon ? undefined : '1.8rem',
      }}>
        {svgIcon ? (
          <div style={{ width: 28, height: 28 }}>{svgIcon}</div>
        ) : (
          icon
        )}
      </div>
      <h3 style={{ marginBottom: 'var(--space-2)' }}>{title}</h3>
      {message && <p className="text-muted" style={{ maxWidth: 300 }}>{message}</p>}
      {action && <div style={{ marginTop: 'var(--space-5)' }}>{action}</div>}
    </motion.div>
  );
}

/* ── Alert ───────────────────────────────────────────────────── */
export function Alert({ type = 'info', children }) {
  if (!children) return null;
  const icons = {
    error:   '⚠️',
    success: '✓',
    info:    'ℹ️',
    warning: '⚡',
  };
  return (
    <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <span aria-hidden="true" style={{ flexShrink: 0 }}>{icons[type]}</span>
      <span>{children}</span>
    </div>
  );
}

/* ── Status Badge ────────────────────────────────────────────── */
const STATUS_STYLES = {
  Open:     'badge-info',
  Pending:  'badge-warning',
  Approved: 'badge-success',
  Rejected: 'badge-danger',
  Matched:  'badge-warning',
  Claimed:  'badge-success',
  Closed:   'badge-neutral',
  Active:   'badge-info',
};

export function StatusBadge({ status }) {
  if (!status) return null;
  const cls = STATUS_STYLES[status] || 'badge-neutral';
  return (
    <span className={`badge ${cls}`}>
      <span className="badge-dot" aria-hidden="true" />
      {status}
    </span>
  );
}

/* ── Role Badge ──────────────────────────────────────────────── */
export function RoleBadge({ role }) {
  const map = {
    Student:         { cls: 'badge-info',    label: 'Student' },
    SecurityOfficer: { cls: 'badge-warning', label: 'Security Officer' },
    Administrator:   { cls: 'badge-danger',  label: 'Administrator' },
  };
  const { cls, label } = map[role] || { cls: 'badge-neutral', label: role };
  return <span className={`badge ${cls}`}>{label}</span>;
}

/* ── AI Badge ────────────────────────────────────────────────── */
export function AIBadge({ label = 'AI' }) {
  return (
    <span className="ai-badge">
      <span className="ai-spark">✦</span>
      {label}
    </span>
  );
}

/* ── Confidence Bar ──────────────────────────────────────────── */
export function ConfidenceBar({ score, animated = true }) {
  const pct = Math.round(score);
  const level = pct >= 80 ? 'high' : pct >= 50 ? 'medium' : 'low';
  const label = pct >= 80 ? 'Very likely' : pct >= 50 ? 'Possible' : 'Low confidence';
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span className="text-sm font-semibold">{pct}% <span className="text-muted font-medium">{label}</span></span>
        <AIBadge label="Match" />
      </div>
      <div className="confidence-bar">
        <motion.div
          className={`confidence-fill ${level}`}
          initial={animated ? { width: 0 } : { width: `${pct}%` }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

/* ── Item Card ───────────────────────────────────────────────── */
import { publicAssetUrl } from '../api/client';

export function ItemCard({ item, type = 'lost', linkTo }) {
  const isLost = type === 'lost' || item?.type === 'lost';
  const statusLabel = isLost ? 'LOST' : 'FOUND';
  const statusCls   = isLost ? 'badge-warning' : 'badge-success';
  const image       = item?.imageUrls?.[0];
  const score       = item?.matchScore ?? item?.confidenceScore;
  const to          = linkTo ?? `/${isLost ? 'lost' : 'found'}-items/${item?.id}`;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
    >
      <Link to={to} className="item-card" aria-label={item?.title}>
        {/* Image */}
        <div className="item-card-image">
          {image ? (
            <img src={publicAssetUrl(image)} alt={item?.title} loading="lazy" />
          ) : (
            <div className="item-card-image-placeholder">
              {isLost ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ width: 36, height: 36, color: 'var(--text-muted)' }}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ width: 36, height: 36, color: 'var(--text-muted)' }}>
                  <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><polyline points="16 3 12 7 8 3"/>
                </svg>
              )}
            </div>
          )}
          <span className={`badge ${statusCls} item-card-status`}>
            <span className="badge-dot" aria-hidden="true" />
            {statusLabel}
          </span>
          {score != null && (
            <span className="item-card-score">✦ {Math.round(score)}%</span>
          )}
        </div>

        {/* Body */}
        <div className="item-card-body">
          <div className="item-card-title">{item?.title}</div>
          <div className="item-card-meta">
            {item?.location && (
              <div className="item-card-meta-row">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>{item.location}</span>
              </div>
            )}
            <div className="item-card-meta-row">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>{formatDate(item?.lostAt ?? item?.foundAt ?? item?.createdAt)}</span>
            </div>
            {score != null && (
              <div className="item-card-meta-row">
                <span style={{ color: 'var(--accent)', fontSize: '0.7rem' }}>✦</span>
                <span style={{ color: 'var(--primary-deep)', fontWeight: 600 }}>
                  AI Match: {score >= 80 ? 'Very likely' : score >= 50 ? 'Possible' : 'Low'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="item-card-footer">
          <StatusBadge status={item?.status} />
        </div>
      </Link>
    </motion.div>
  );
}

/* ── formatDate helper ───────────────────────────────────────── */
export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return `Today, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  if (diffDays === 1) return `Yesterday, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  if (diffDays < 7)  return `${diffDays} days ago`;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/* ── AI Processing State ─────────────────────────────────────── */
export function AIProcessing({ steps = ['Description', 'Location', 'Time', 'Images'] }) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 16px' }}>
      <motion.div
        style={{ fontSize: '1.5rem', marginBottom: 16 }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        ✦
      </motion.div>
      <p className="font-semibold text-secondary" style={{ marginBottom: 16 }}>
        AI is finding connections…
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 240, margin: '0 auto' }}>
        {steps.map((step, i) => (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.3 + 0.5 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', color: 'var(--text-secondary)' }}
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.3 + 0.8 }}
              style={{ color: 'var(--primary)', fontWeight: 700 }}
            >
              ✓
            </motion.span>
            {step}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── Success Checkmark ───────────────────────────────────────── */
export function SuccessCheck({ size = 64 }) {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      style={{
        width: size, height: size,
        borderRadius: '50%',
        background: 'var(--success-bg)',
        display: 'grid',
        placeItems: 'center',
        margin: '0 auto',
      }}
    >
      <svg
        width={size * 0.5} height={size * 0.5}
        viewBox="0 0 24 24" fill="none"
        stroke="var(--success)" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round"
      >
        <motion.polyline
          points="20 6 9 17 4 12"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
        />
      </svg>
    </motion.div>
  );
}

/* ── Section header with optional link ───────────────────────── */
export function SectionHeader({ title, linkTo, linkLabel = 'View all', children }) {
  return (
    <div className="section-heading">
      <h3 style={{ margin: 0 }}>{title}</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {children}
        {linkTo && (
          <Link to={linkTo} className="text-sm font-semibold" style={{ color: 'var(--primary-deep)' }}>
            {linkLabel} →
          </Link>
        )}
      </div>
    </div>
  );
}

/* ── Staggered list entrance ─────────────────────────────────── */
export function StaggerList({ children, stagger = 0.06 }) {
  const items = Array.isArray(children) ? children : [children];
  return (
    <>
      {items.map((child, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * stagger, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {child}
        </motion.div>
      ))}
    </>
  );
}
