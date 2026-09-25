import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../api/notifications';
import { Alert, PageLoading } from '../components/Ui';
import { formatBangladeshDate } from '../api/client';

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [nextBefore, setNextBefore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = async before => {
    const page = await getNotifications({ before, take: 25 });
    setItems(current => before ? [...current, ...(page.items || [])] : (page.items || []));
    setNextBefore(page.nextBefore);
  };
  useEffect(() => { load().catch(err => setError(err.message)).finally(() => setLoading(false)); }, []);
  async function open(notification) {
    try {
      if (!notification.isRead) await markNotificationRead(notification.id);
      setItems(current => current.map(item => item.id === notification.id ? { ...item, isRead: true } : item));
      if (notification.link) navigate(notification.link);
    } catch (err) { setError(err.message); }
  }
  async function markAll() {
    try { await markAllNotificationsRead(); setItems(current => current.map(item => ({ ...item, isRead: true }))); }
    catch (err) { setError(err.message); }
  }
  if (loading) return <PageLoading label="Loading notification history…" />;
  return <div className="page-container-form"><div className="page-header"><div><span className="eyebrow">Activity</span><h1>Notifications</h1><p className="text-secondary">Your recent CampusFind updates and actions.</p></div>{items.some(item => !item.isRead) && <button className="btn btn-secondary" onClick={markAll}>Mark all read</button>}</div>{error && <Alert type="error">{error}</Alert>}<section className="card">{items.length === 0 ? <p className="text-secondary" style={{ padding: 24 }}>You have no notifications yet.</p> : items.map(notification => <button type="button" key={notification.id} onClick={() => open(notification)} style={{ width: '100%', textAlign: 'left', border: 0, borderBottom: '1px solid var(--border)', padding: '16px 20px', background: notification.isRead ? 'transparent' : 'var(--surface-card-alt)', cursor: notification.link ? 'pointer' : 'default' }}><strong>{title(notification.category)}</strong><span style={{ display: 'block', marginTop: 4 }}>{notification.message}</span><small className="text-muted" style={{ display: 'block', marginTop: 6 }}>{formatBangladeshDate(notification.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</small></button>)}</section>{nextBefore && <button className="btn btn-secondary" style={{ marginTop: 18 }} onClick={() => load(nextBefore)}>Load older notifications</button>}</div>;
}

function title(category) {
  return ({ MATCH_FOUND: 'Potential Match Found', CLAIM_SUBMITTED: 'Claim Submitted', CLAIM_APPROVED: 'Claim Approved', CLAIM_REJECTED: 'Claim Not Approved', CLAIM_UNDER_REVIEW: 'Claim Under Review', NEW_CLAIM_MESSAGE: 'New Message', HANDOVER_READY: 'Handover Ready', HANDOVER_COMPLETED: 'Handover Completed' })[category] || 'CampusFind update';
}
