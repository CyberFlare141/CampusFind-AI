import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, PageLoading, SuccessCheck } from '../components/Ui';
import { formatBangladeshDate } from '../api/client';
import { getSupportPayment } from '../api/supportPayments';

export default function SupportResultPage({ expected }) {
  const [params] = useSearchParams(); const navigate = useNavigate(); const id = params.get('id'); const [payment, setPayment] = useState(null); const [error, setError] = useState('');
  useEffect(() => { if (!id) { navigate('/support', { replace: true }); return; } getSupportPayment(id).then(item => { setPayment(item); if (expected === 'Succeeded' && (!item.isVerified || item.status !== 'Succeeded')) navigate(item.status === 'Cancelled' ? `/support/cancelled?id=${id}` : `/support/failed?id=${id}`, { replace: true }); }).catch(err => setError(err.message)); }, [id, expected, navigate]);
  if (!payment && !error) return <PageLoading label="Checking your verified payment status…" />;
  if (error) return <section className="page-container-form"><Alert type="error">{error}</Alert><Link className="btn btn-secondary" to="/support">Back to support</Link></section>;
  const succeeded = expected === 'Succeeded' && payment.isVerified && payment.status === 'Succeeded';
  const cancelled = payment.status === 'Cancelled';
  return <section className="page-container-form"><div className="card card-pad-lg" style={{ textAlign: 'center' }}>{succeeded && <SuccessCheck />}<span className="eyebrow" style={{ display: 'block', marginTop: succeeded ? 18 : 0 }}>Support CampusFind</span><h1>{succeeded ? 'Thank You! ☕❤️' : cancelled ? 'Payment cancelled' : "We couldn't complete that payment."}</h1><p className="text-secondary">{succeeded ? 'Your support helps us keep improving CampusFind.' : cancelled ? 'No payment was completed. You can return to CampusFind or try again whenever you like.' : 'No payment was completed. Please try again later if you would still like to support CampusFind.'}</p>{succeeded && <Receipt payment={payment} />}<div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>{!succeeded && <Link className="btn btn-primary" to="/support">Try Again</Link>}<Link className="btn btn-secondary" to="/">Back to CampusFind</Link>{succeeded && <button className="btn btn-ghost" onClick={() => window.print()}>Print Receipt</button>}</div></div></section>;
}

function Receipt({ payment }) { return <div style={{ margin: '24px auto 0', maxWidth: 430, padding: 20, textAlign: 'left', border: '1px dashed var(--border)', borderRadius: 12 }}><strong>CampusFind AI</strong><p className="text-secondary" style={{ margin: '6px 0 16px' }}>Support contribution receipt</p><p><strong>Amount:</strong> ৳{payment.amount}</p><p><strong>Provider:</strong> {payment.provider}</p><p><strong>Transaction/reference:</strong> {payment.providerTransactionId || payment.merchantInvoiceNumber}</p><p><strong>Date:</strong> {formatBangladeshDate(payment.completedAt || payment.createdAt, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p><p><strong>Status:</strong> Successful</p></div>; }
