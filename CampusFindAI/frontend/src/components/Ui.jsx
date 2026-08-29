// Small, dependency-free UI primitives reused across pages.

export function PageLoading({ label = 'Loading\u2026' }) {
  return (
    <div className="page-loading">
      <span className="spinner spinner-dark" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ButtonSpinner() {
  return <span className="spinner" aria-hidden="true" />;
}

export function EmptyState({ icon = '\u{1F4ED}', title, message, action }) {
  return (
    <div className="empty-state card">
      <div className="icon">{icon}</div>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}

export function Alert({ type = 'info', children }) {
  if (!children) return null;
  const icon = type === 'error' ? '\u26A0\uFE0F' : type === 'success' ? '\u2705' : '\u2139\uFE0F';
  return (
    <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <span aria-hidden="true">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

const STATUS_STYLES = {
  Open: 'badge-info',
  Pending: 'badge-warning',
  Approved: 'badge-success',
  Rejected: 'badge-danger',
  Matched: 'badge-warning',
  Claimed: 'badge-success',
  Closed: 'badge-neutral',
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

export function RoleBadge({ role }) {
  const styles = {
    Student: 'badge-info',
    SecurityOfficer: 'badge-warning',
    Administrator: 'badge-danger',
  };
  const labels = {
    Student: 'Student',
    SecurityOfficer: 'Security Officer',
    Administrator: 'Administrator',
  };
  return <span className={`badge ${styles[role] || 'badge-neutral'}`}>{labels[role] || role}</span>;
}

export function SkeletonCard() {
  return (
    <div className="card card-pad">
      <div className="skeleton" style={{ height: 16, width: '60%', marginBottom: 10 }} />
      <div className="skeleton" style={{ height: 12, width: '90%', marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 12, width: '40%' }} />
    </div>
  );
}

export function formatDate(value) {
  if (!value) return '\u2014';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '\u2014';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
