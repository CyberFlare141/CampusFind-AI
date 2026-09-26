// CampusFind AI — Premium UI Primitives & Motion System v3.6
// Clean, tactile components and motion primitives used across all pages.

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { formatBangladeshDate, publicAssetUrl } from '../api/client';

/* ── Motion Variants & Constants ─────────────────────────────── */
export const MOTION = {
  durations: {
    micro: 0.15,
    interaction: 0.22,
    component: 0.35,
    page: 0.42,
    ambient: 5.0,
  },
  easings: {
    smooth: [0.22, 1, 0.36, 1],
    outSmooth: [0.16, 1, 0.3, 1],
    inOutSmooth: [0.4, 0, 0.2, 1],
    spring: { type: 'spring', stiffness: 280, damping: 22 },
  },
  pageVariants: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -6 },
    transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
  },
  pageKinds: {
    catalog: {
      initial: { opacity: 0, y: 12 },
      animate: { opacity: 1, y: 0 },
    },
    detail: {
      initial: { opacity: 0, x: -10 },
      animate: { opacity: 1, x: 0 },
    },
    form: {
      initial: { opacity: 0, rotate: -0.35, y: 8 },
      animate: { opacity: 1, rotate: 0, y: 0 },
    },
    chat: {
      initial: { opacity: 0, x: 12 },
      animate: { opacity: 1, x: 0 },
    },
    map: {
      initial: { opacity: 0, scale: 0.985 },
      animate: { opacity: 1, scale: 1 },
    },
    desk: {
      initial: { opacity: 0, y: 6, scale: 0.995 },
      animate: { opacity: 1, y: 0, scale: 1 },
    },
  },
  cardHover: {
    rest: { y: 0, scale: 1 },
    hover: { y: -2, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } },
  },
};

/**
 * Shared page entrance with a small vocabulary of context-aware movements.
 * Keeping this here prevents every route from inventing a bespoke fade-up.
 */
export function PageMotion({ children, kind = 'desk', className, ...props }) {
  const reducedMotion = useReducedMotion();
  const motionKind = MOTION.pageKinds[kind] || MOTION.pageKinds.desk;

  return (
    <motion.div
      {...props}
      className={className}
      initial={reducedMotion ? false : motionKind.initial}
      animate={motionKind.animate}
      transition={{ duration: MOTION.durations.component, ease: MOTION.easings.smooth }}
    >
      {children}
    </motion.div>
  );
}

/** A reusable sender-aware entrance for chat messages, notices, and ticket toasts. */
export function SlideIn({ children, from = 'left', className, delay = 0, as = 'div', ...props }) {
  const reducedMotion = useReducedMotion();
  const x = from === 'right' ? 14 : from === 'bottom' ? 0 : -14;
  const y = from === 'bottom' ? 10 : 0;
  const MotionElement = motion[as] || motion.div;

  return (
    <MotionElement
      {...props}
      className={className}
      initial={reducedMotion ? false : { opacity: 0, x, y }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: MOTION.durations.component, delay, ease: MOTION.easings.outSmooth }}
    >
      {children}
    </MotionElement>
  );
}

/* ── Metric Count-Up Animation (Physical & Smooth) ───────────── */
export function AnimatedNumber({ value, duration = 750, prefix = '', suffix = '', formatter }) {
  const target = typeof value === 'number' ? value : parseInt(value, 10) || 0;
  const [displayValue, setDisplayValue] = useState(0);
  const prevTargetRef = useRef(target);

  useEffect(() => {
    // Check user preference for reduced motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(target);
      return;
    }

    const startVal = prevTargetRef.current !== target ? prevTargetRef.current : 0;
    const startTime = performance.now();
    let animId;

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic: 1 - (1 - t)^3
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (target - startVal) * easeOut);
      setDisplayValue(current);

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        prevTargetRef.current = target;
      }
    }

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [target, duration]);

  return <>{prefix}{formatter ? formatter(displayValue) : displayValue}{suffix}</>;
}

/* ── Fade-In Image with Fallback ─────────────────────────────── */
export function FadeImage({ src, alt, className, style, placeholder, loading = 'eager' }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  // Check if image is already cached / completed
  useEffect(() => {
    if (imgRef.current) {
      if (imgRef.current.complete) {
        if (imgRef.current.naturalWidth > 0) {
          setLoaded(true);
        } else if (imgRef.current.naturalWidth === 0 && src) {
          setFailed(true);
        }
      }
    }
  }, [src]);

  if (!src || failed) {
    return placeholder || (
      <div className="item-image-fallback" role="img" aria-label={alt || 'No image available'}>
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {!loaded && (
        <div
          className="skeleton skeleton-img"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            margin: 0,
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />
      )}
      <motion.img
        ref={imgRef}
        src={src}
        alt={alt || ''}
        className={className}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          position: 'relative',
          zIndex: 1,
          ...style,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        loading={loading}
      />
    </div>
  );
}

/* ── Page Loading Spinner ────────────────────────────────────── */
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
      <span className="text-muted text-sm font-medium">{label}</span>
    </div>
  );
}

/* ── Button Spinner (for form buttons) ───────────────────────── */
export function ButtonSpinner() {
  return <span className="spinner" aria-hidden="true" />;
}

/* ── Skeleton Loaders ────────────────────────────────────────── */
export function SkeletonCard() {
  return (
    <div className="card card-pad">
      <div className="skeleton skeleton-img" style={{ height: 180, marginBottom: 16 }} />
      <div className="skeleton skeleton-title" style={{ width: '75%' }} />
      <div className="skeleton skeleton-text" style={{ width: '90%' }} />
      <div className="skeleton skeleton-text" style={{ width: '60%' }} />
    </div>
  );
}

export function SkeletonText({ width = '100%', height = 14, style }) {
  return <div className="skeleton" style={{ width, height, borderRadius: 4, ...style }} />;
}

export function SkeletonGrid({ count = 8 }) {
  return (
    <div className="item-grid">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.04 }}
        >
          <SkeletonCard />
        </motion.div>
      ))}
    </div>
  );
}

/* ── Campus Discovery Radar Visual Motif ─────────────────────── */
export function CampusDiscoveryRadar({ count = 0 }) {
  return (
    <div className="campus-radar" aria-hidden="true">
      {/* Concentric scan rings */}
      <motion.div
        className="radar-ring radar-ring-1"
        animate={{ scale: [1, 1.05, 1], opacity: [0.65, 1, 0.65] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="radar-ring radar-ring-2"
        animate={{ rotate: 360 }}
        transition={{ duration: 36, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="radar-ring radar-ring-3"
        animate={{ scale: [1, 1.025, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Center Discovery Core */}
      <motion.div
        className="radar-core"
        whileHover={{ scale: 1.08 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </motion.div>

      {/* Orbiting Floating Node 1: AI Radar */}
      <motion.div
        className="radar-node"
        style={{ top: 22, right: 6 }}
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span style={{ color: 'var(--accent-deep)', fontSize: '0.85rem' }}>✦</span>
        <span>AI Match Scan</span>
      </motion.div>

      {/* Orbiting Floating Node 2: Campus Grid */}
      <motion.div
        className="radar-node"
        style={{ bottom: 32, left: 6 }}
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 5.0, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
      >
        <span style={{ color: 'var(--primary-deep)', fontSize: '0.8rem' }}>📍</span>
        <span>Campus Grid</span>
      </motion.div>

      {/* Orbiting Floating Node 3: Verified Returns */}
      <motion.div
        className="radar-node"
        style={{ bottom: 16, right: 24 }}
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
      >
        <span style={{ color: 'var(--success)', fontSize: '0.8rem' }}>✓</span>
        <span>Verified Returns</span>
      </motion.div>
    </div>
  );
}

/* ── Art-Directed Empty State with Ambient Motion ───────────── */
export function EmptyState({ icon = null, svgIcon = null, title, message, action }) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      className="empty-state"
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : MOTION.durations.component, ease: MOTION.easings.smooth }}
    >
      <motion.div
        className="empty-state-icon-wrap"
        animate={reducedMotion ? undefined : { y: [0, -4, 0] }}
        transition={{ duration: MOTION.durations.ambient, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: 68, height: 68,
          borderRadius: 'var(--radius-xl)',
          background: 'rgba(143, 162, 138, 0.16)',
          border: '1.5px dashed rgba(143, 162, 138, 0.40)',
          display: 'grid',
          placeItems: 'center',
          marginBottom: 'var(--space-4)',
          color: 'var(--primary-deep)',
          boxShadow: 'var(--shadow-soft)',
        }}
      >
        {svgIcon ? (
          <div style={{ width: 30, height: 30, display: 'grid', placeItems: 'center' }}>{svgIcon}</div>
        ) : (
          <span style={{ fontSize: '1.8rem' }}>{icon || '✦'}</span>
        )}
      </motion.div>
      <h3 style={{ marginBottom: 'var(--space-2)' }}>{title}</h3>
      {message && <p>{message}</p>}
      {action && <div style={{ marginTop: 'var(--space-4)' }}>{action}</div>}
    </motion.div>
  );
}

/* ── Alerts & Notices ────────────────────────────────────────── */
export function Alert({ type = 'info', children }) {
  const reducedMotion = useReducedMotion();
  // Hooks must run in the same order on every render.  Alerts commonly start
  // empty and receive an API error after a request completes, so returning
  // before this hook turns that normal state change into a page-level crash.
  if (!children) return null;
  const icons = {
    error: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
    success: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
    info: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="8"/>
      </svg>
    ),
    warning: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  };
  return (
    <motion.div
      className={`alert alert-${type}`}
      role={type === 'error' ? 'alert' : 'status'}
      initial={reducedMotion ? false : { opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : MOTION.durations.interaction, ease: MOTION.easings.smooth }}
    >
      <span aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }}>{icons[type]}</span>
      <span>{children}</span>
    </motion.div>
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
export function RoleBadge({ role, isRestricted = false }) {
  const map = {
    Student:         { cls: 'badge-info',    label: isRestricted ? 'User' : 'Student' },
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
  const label = pct >= 80 ? 'Very likely match' : pct >= 50 ? 'Possible match' : 'Low confidence';
  const reducedMotion = useReducedMotion();
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span className="text-sm font-semibold text-primary">
          {pct}% <span className="text-muted font-medium" style={{ fontSize: '0.8rem' }}>· {label}</span>
        </span>
        <AIBadge label="AI Match" />
      </div>
      <div className="confidence-bar">
        <motion.div
          className={`confidence-fill ${level}`}
          initial={animated && !reducedMotion ? { width: 0 } : { width: `${pct}%` }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: reducedMotion ? 0 : MOTION.durations.page, ease: MOTION.easings.smooth }}
        />
      </div>
    </div>
  );
}

/* ── Standalone Item Card ────────────────────────────────────── */
export function ItemCard({ item, type = 'lost', linkTo, isMine }) {
  const isLost = type === 'lost' || item?.type === 'lost';
  const statusLabel = isLost ? 'LOST' : 'FOUND';
  const statusCls   = isLost ? 'badge-warning' : 'badge-success';
  const image       = item?.imageUrls?.[0];
  const score       = item?.matchScore ?? item?.confidenceScore;
  const to          = linkTo ?? `/${isLost ? 'lost' : 'found'}-items/${item?.id}`;

  return (
    <Link to={to} className="item-card" aria-label={item?.title}>
      {/* Image Container with Fade-In Transition */}
      <div className="item-card-image">
        {image ? (
          <FadeImage
            src={publicAssetUrl(image)}
            alt={item?.title}
            placeholder={(
              <div className="item-card-image-placeholder">
                <span style={{ fontSize: '1.8rem', color: 'var(--text-muted)' }}>📷</span>
              </div>
            )}
          />
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
        {isMine ? (
          <span className="item-card-score" style={{ background: 'rgba(74, 99, 71, 0.9)' }}>
            Yours
          </span>
        ) : score != null ? (
          <span className="item-card-score">✦ {Math.round(score)}%</span>
        ) : null}
      </div>

      {/* Body */}
      <div className="item-card-body">
        <div className="item-card-title">{item?.title}</div>
        {item?.description && (
          <p className="text-xs text-muted" style={{ lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {item.description}
          </p>
        )}
        <div className="item-card-meta">
          {item?.locationDetails && (
            <div className="item-card-meta-row">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>{item.locationDetails}</span>
            </div>
          )}
          {!item?.locationDetails && (item?.buildingName || item?.floorName || item?.locationName || item?.location) && (
            <div className="item-card-meta-row">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>{[item.buildingName, item.floorName, item.locationName || item.location].filter(Boolean).join(' • ')}</span>
            </div>
          )}
          {item?.categoryName && <div className="item-card-meta-row"><span>🏷</span><span>{item.categoryName}</span></div>}
          <div className="item-card-meta-row">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>{formatDate(item?.lostAt ?? item?.foundAt ?? item?.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="item-card-footer">
        <StatusBadge status={item?.status} />
        <span className="text-xs font-semibold" style={{ color: 'var(--primary-deep)' }}>View details →</span>
      </div>
    </Link>
  );
}

/* ── formatDate Helper ───────────────────────────────────────── */
export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return `Today, ${formatBangladeshDate(d, { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Dhaka' })}`;
  if (diffDays === 1) return `Yesterday, ${formatBangladeshDate(d, { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Dhaka' })}`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatBangladeshDate(d, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Dhaka' });
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

/* ── Section Header With Link ────────────────────────────────── */
export function SectionHeader({ title, linkTo, linkLabel = 'View all', children }) {
  return (
    <div className="section-heading">
      <h3 style={{ margin: 0, fontSize: '1.25rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{title}</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {children}
        {linkTo && (
          <Link to={linkTo} className="text-sm font-semibold" style={{ color: 'var(--primary-deep)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {linkLabel} →
          </Link>
        )}
      </div>
    </div>
  );
}

/* ── Staggered List Entrance ─────────────────────────────────── */
export function StaggerList({ children, stagger = 0.05 }) {
  // Conditional JSX can leave `false` placeholders in a grid. Do not render
  // animation wrappers for those placeholders, or they become empty grid cells.
  const items = (Array.isArray(children) ? children : [children]).filter(Boolean);
  const reducedMotion = useReducedMotion();
  return (
    <>
      {items.map((child, i) => (
        <motion.div
          key={i}
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reducedMotion ? 0 : Math.min(i * stagger, 0.3), duration: MOTION.durations.component, ease: MOTION.easings.smooth }}
        >
          {child}
        </motion.div>
      ))}
    </>
  );
}

/* ── CountUp — alias for AnimatedNumber ─────────────────────── */
export const CountUp = AnimatedNumber;

/* ── Ambient Bubble Background ───────────────────────────────── */
// Rendered via a React portal directly on document.body so it
// is completely unaffected by overflow:hidden or stacking contexts
// inside the app shell. z-index: 1 keeps it above the page background
// but below all app UI (sidebar is z-index: 30, topbar similar).
const BUBBLE_CONFIG = [
  { left: '4%',  size: 18, dur: 16, delay: 0   },
  { left: '11%', size: 28, dur: 22, delay: 3.1 },
  { left: '19%', size: 13, dur: 14, delay: 6.8 },
  { left: '27%', size: 36, dur: 20, delay: 1.4 },
  { left: '35%', size: 22, dur: 17, delay: 8.2 },
  { left: '43%', size: 10, dur: 11, delay: 4.5 },
  { left: '51%', size: 32, dur: 19, delay: 2.7 },
  { left: '58%', size: 16, dur: 15, delay: 7.0 },
  { left: '66%', size: 42, dur: 23, delay: 0.9 },
  { left: '74%', size: 20, dur: 18, delay: 5.3 },
  { left: '82%', size: 12, dur: 13, delay: 9.1 },
  { left: '90%', size: 26, dur: 21, delay: 3.8 },
  { left: '96%', size: 34, dur: 16, delay: 6.2 },
];

export function BubbleBackground() {
  return (
    <div className="bubble-canvas" aria-hidden="true">
      {BUBBLE_CONFIG.map((b, i) => (
        <span
          key={i}
          className="bubble"
          style={{
            left: b.left,
            width: b.size,
            height: b.size,
            '--bub-dur': `${b.dur}s`,
            '--bub-delay': `${b.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Auth-panel Bubble Background (white variant, inline) ────── */
// Auth panel already clips its own overflow so this stays inline
// (absolute-positioned inside the green panel — no portal needed).
const AUTH_BUBBLE_CONFIG = [
  { left: '6%',  size: 22, dur: 14, delay: 0   },
  { left: '18%', size: 38, dur: 20, delay: 2.5 },
  { left: '30%', size: 16, dur: 12, delay: 5.0 },
  { left: '45%', size: 30, dur: 18, delay: 1.2 },
  { left: '62%', size: 14, dur: 15, delay: 7.3 },
  { left: '75%', size: 26, dur: 22, delay: 3.6 },
  { left: '88%', size: 20, dur: 16, delay: 4.9 },
];

export function AuthBubbleBackground() {
  return (
    <div
      className="bubble-canvas"
      aria-hidden="true"
      style={{ position: 'absolute', zIndex: 0 }}
    >
      {AUTH_BUBBLE_CONFIG.map((b, i) => (
        <span
          key={i}
          className="bubble"
          style={{
            left: b.left,
            width: b.size,
            height: b.size,
            '--bub-dur': `${b.dur}s`,
            '--bub-delay': `${b.delay}s`,
            background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.12) 55%, rgba(255,255,255,0.03) 100%)',
            borderColor: 'rgba(255,255,255,0.22)',
          }}
        />
      ))}
    </div>
  );
}

/* ── Auth Voronoi Cellular Decor ────────────────────────────── */
export function AuthCellularDecor({ variant = 'canvas' }) {
  if (variant === 'hero') return null;
  return (
    <div className="auth-canvas-cellular-decor" aria-hidden="true">
      <img
        src="/cellular-lattice.png"
        alt=""
        className="auth-canvas-cellular-img"
      />
    </div>
  );
}

