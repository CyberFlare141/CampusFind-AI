import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, PageLoading } from '../components/Ui';
import { getMySecurityOfficerRequest, submitSecurityOfficerRequest } from '../api/securityOfficerRequests';

export default function SecurityOfficerRequestPage() {
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [reason, setReason] = useState('');
  const [additionalInformation, setAdditionalInformation] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getMySecurityOfficerRequest()
      .then(setRequest)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      setRequest(await submitSecurityOfficerRequest({ reason, additionalInformation }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageLoading />;

  return (
    <div className="page-container">
      <div className="page-header">
        <div><span className="eyebrow">Institutional access</span><h1>Security Officer Request</h1><p className="text-muted">Tell an administrator why you need Security Officer access.</p></div>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>Back to dashboard</button>
      </div>
      <Alert type="error">{error}</Alert>
      {request ? (
        <section className="card" style={{ maxWidth: 720 }}>
          <span className="eyebrow">Request status</span>
          <h2>{request.status}</h2>
          <p className="text-muted">Submitted {new Date(request.submittedAt).toLocaleString()}</p>
          <p><strong>Reason:</strong> {request.reason}</p>
          <p><strong>Additional information:</strong> {request.additionalInformation}</p>
          {request.adminNotes && <p><strong>Administrator notes:</strong> {request.adminNotes}</p>}
          {request.status !== 'Pending' && <button className="btn btn-secondary" onClick={() => setRequest(null)}>Submit another request</button>}
        </section>
      ) : (
        <form className="card" style={{ maxWidth: 720, display: 'grid', gap: 18 }} onSubmit={submit}>
          <div className="form-field"><label htmlFor="request-reason">Reason for request</label><input id="request-reason" required maxLength="500" value={reason} onChange={event => setReason(event.target.value)} /></div>
          <div className="form-field"><label htmlFor="request-details">Student, employee, institution, or other supporting information</label><textarea id="request-details" required maxLength="2000" rows="7" value={additionalInformation} onChange={event => setAdditionalInformation(event.target.value)} /></div>
          <button className="btn btn-primary" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit request'}</button>
        </form>
      )}
    </div>
  );
}
