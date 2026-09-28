import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, ButtonSpinner, PageLoading } from '../components/Ui';
import { getSupportPayment, simulateSupportPayment } from '../api/supportPayments';

export default function SupportProcessingPage() {
  const [params] = useSearchParams(); const navigate = useNavigate(); const id = params.get('id');
  const [payment, setPayment] = useState(null); const [error, setError] = useState(''); const [busy, setBusy] = useState('');
  useEffect(() => { if (!id) { navigate('/support', { replace: true }); return; } getSupportPayment(id).then(setPayment).catch(err => setError(err.message)); }, [id, navigate]);
  async function simulate(outcome) { setBusy(outcome); setError(''); try { const next = await simulateSupportPayment(id, outcome); setPayment(next); navigate(next.status === 'Succeeded' ? `/support/success?id=${id}` : next.status === 'Cancelled' ? `/support/cancelled?id=${id}` : `/support/failed?id=${id}`, { replace: true }); } catch (err) { setError(err.message); } finally { setBusy(''); } }
  if (!payment && !error) return <PageLoading label="Connecting securely to your payment provider…" />;
  if (error) return <section className="page-container-form"><Alert type="error">{error}</Alert><Link className="btn btn-secondary" to="/support">Back to support</Link></section>;
  return <section className="page-container-form"><div className="card card-pad-lg" style={{ textAlign: 'center' }}><span className="eyebrow">Support CampusFind</span><h1>Connecting securely to {payment.provider}…</h1><p className="text-secondary">CampusFind never asks for your PIN, OTP, or wallet password.</p>{payment.isTestPayment ? <><Alert type="info">TEST PAYMENT — NO REAL MONEY. Choose a local simulator outcome below.</Alert><div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 22 }}><button className="btn btn-primary" disabled={!!busy} onClick={() => simulate('success')}>{busy === 'success' ? <ButtonSpinner /> : 'Simulate Successful Payment'}</button><button className="btn btn-secondary" disabled={!!busy} onClick={() => simulate('failed')}>Simulate Failed Payment</button><button className="btn btn-ghost" disabled={!!busy} onClick={() => simulate('cancelled')}>Simulate Cancelled Payment</button></div></> : <p>Waiting for the provider’s verified result. Do not close this page.</p>}</div></section>;
}
