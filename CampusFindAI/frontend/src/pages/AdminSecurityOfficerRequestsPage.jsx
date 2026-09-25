import { useEffect, useState } from 'react';
import { Alert, PageLoading } from '../components/Ui';
import { approveSecurityOfficerRequest, getSecurityOfficerRequests, rejectSecurityOfficerRequest } from '../api/securityOfficerRequests';

export default function AdminSecurityOfficerRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [decidingId, setDecidingId] = useState(null);

  async function load() {
    try { setRequests(await getSecurityOfficerRequests()); } catch (err) { setError(err.message); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function decide(request, approve) {
    setDecidingId(request.id);
    setError('');
    try {
      const updated = approve
        ? await approveSecurityOfficerRequest(request.id, '')
        : await rejectSecurityOfficerRequest(request.id, '');
      setRequests(current => current.map(item => item.id === updated.id ? updated : item));
    } catch (err) {
      setError(err.message || 'The request could not be updated.');
    } finally {
      setDecidingId(null);
    }
  }

  if (loading) return <PageLoading />;
  return (
    <div className="page-container admin-requests-page">
      <div className="page-header"><div><span className="eyebrow">Administration</span><h1>Security Officer Requests</h1><p className="text-muted">Review institutional access requests.</p></div></div>
      <Alert type="error">{error}</Alert>
      <div className="admin-requests-list" style={{ display: 'grid', gap: 16 }}>
        {requests.map(request => (
          <article className="card admin-request-card" key={request.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}><div><h2>{request.fullName || request.userEmail}</h2><p className="text-muted">{request.userEmail} · {request.status}</p></div><span className="badge">{request.status}</span></div>
            <p><strong>Reason:</strong> {request.reason}</p><p><strong>Information:</strong> {request.additionalInformation}</p>
            {request.status === 'Pending' && <div style={{ display: 'flex', gap: 10 }}><button className="btn btn-primary" disabled={decidingId === request.id} onClick={() => decide(request, true)}>{decidingId === request.id ? 'Saving…' : 'Approve'}</button><button className="btn btn-secondary" disabled={decidingId === request.id} onClick={() => decide(request, false)}>Reject</button></div>}
            {request.adminNotes && <p className="text-muted"><strong>Notes:</strong> {request.adminNotes}</p>}
          </article>
        ))}
        {!requests.length && <div className="card"><p className="text-muted">No requests have been submitted.</p></div>}
      </div>
    </div>
  );
}
