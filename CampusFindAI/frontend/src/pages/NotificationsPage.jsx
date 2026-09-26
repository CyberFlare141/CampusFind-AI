import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../api/notifications';
import { Alert, EmptyState, PageLoading, SlideIn } from '../components/Ui';
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
    try {
      await markAllNotificationsRead();
      setItems(current => current.map(item => ({ ...item, isRead: true })));
    } catch (err) { setError(err.message); }
  }

  if (loading) return <PageLoading label="Loading notification history..." />;

  return (
    <div className="page-container-form notifications-page">
      <div className="page-header notifications-header">
        <div>
          <span className="eyebrow">Activity ledger</span>
          <h1>Notifications</h1>
          <p className="text-secondary">Your recent CampusFind updates and actions.</p>
        </div>
        {items.some(item => !item.isRead) && <button className="btn btn-secondary" onClick={markAll}>Mark all read</button>}
      </div>
      {error && <Alert type="error">{error}</Alert>}
      {items.length === 0 ? (
        <EmptyState icon="🔔" title="You're all caught up" message="Updates about matches, claims, and handovers will appear here." />
      ) : (
        <section className="notification-ledger" aria-label="Notification history">
          {items.map((notification, index) => (
            <SlideIn key={notification.id} from="right" delay={Math.min(index * 0.035, 0.28)} className="notification-ticket-entry">
              <button
                type="button"
                className={`notification-ticket ${notification.isRead ? 'is-read' : 'is-unread'}`}
                onClick={() => open(notification)}
                aria-disabled={!notification.link}
              >
                <span className="notification-ticket-kicker">{title(notification.category)}</span>
                <span className="notification-ticket-message">{notification.message}</span>
                <span className="notification-ticket-time">{formatBangladeshDate(notification.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </button>
            </SlideIn>
          ))}
        </section>
      )}
      {nextBefore && <button className="btn btn-secondary notification-load-more" onClick={() => load(nextBefore)}>Load older notifications</button>}
    </div>
  );
}

function title(category) {
  return ({
    MATCH_FOUND: 'Potential Match Found',
    CLAIM_SUBMITTED: 'Claim Submitted',
    CLAIM_APPROVED: 'Claim Approved',
    CLAIM_REJECTED: 'Claim Not Approved',
    CLAIM_UNDER_REVIEW: 'Claim Under Review',
    NEW_CLAIM_MESSAGE: 'New Message',
    HANDOVER_READY: 'Handover Ready',
    HANDOVER_COMPLETED: 'Handover Completed',
  })[category] || 'CampusFind update';
}
