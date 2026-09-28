import { useEffect, useState } from 'react';
import { Alert, EmptyState, PageLoading } from '../components/Ui';
import { formatBangladeshDate } from '../api/client';
import { getMySupportPayments, getSupportPaymentAvailability } from '../api/supportPayments';

const SUGGESTED = [
  { amount: 20, label: 'A small coffee ☕' },
  { amount: 50, label: 'Keep CampusFind running ❤️' },
  { amount: 100, label: 'Support future improvements 🚀' },
  { amount: 200, label: 'Big supporter 🌟' },
];

const PROVIDER_URLS = {
  bkash: 'https://www.bkash.com/en',
  nagad: 'https://www.nagad.com.bd/en/',
};

const SUPPORT_PAYMENT_NUMBER = '01305081201';

export default function SupportPage() {
  const [availability, setAvailability] = useState(null); const [history, setHistory] = useState([]);
  const [amount, setAmount] = useState(50); const [customAmount, setCustomAmount] = useState(''); const [provider, setProvider] = useState('');
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');

  useEffect(() => { Promise.all([getSupportPaymentAvailability(), getMySupportPayments()]).then(([config, payments]) => { setAvailability(config); setHistory(payments || []); if (config.bkashAvailable) setProvider('bkash'); else if (config.nagadAvailable) setProvider('nagad'); }).catch(err => setError(err.message)).finally(() => setLoading(false)); }, []);
  const selectedAmount = customAmount === '' ? amount : Number(customAmount);
  const validAmount = availability && Number.isFinite(selectedAmount) && selectedAmount >= availability.minimumAmount && selectedAmount <= availability.maximumAmount;

  function continuePayment() {
    if (!validAmount || !provider) return;
    window.open(PROVIDER_URLS[provider], '_blank', 'noopener,noreferrer');
  }

  if (loading) return <PageLoading label="Preparing support options…" />;
  return <section className="page-container" style={{ maxWidth: 980 }}>
    <header className="page-header"><div><span className="eyebrow">Optional support</span><h1>Buy Us a Coffee ☕</h1><p>CampusFind helped you find something you thought was gone? You can support the project with a small voluntary contribution.</p></div></header>
    <div className="card" style={{ padding: 24, marginBottom: 22, border: '1px solid var(--primary-light)' }}>
      <p style={{ marginTop: 0, fontWeight: 700 }}>Supporting CampusFind is completely optional.</p>
      <p className="text-secondary">Every CampusFind feature remains free: reporting, searching, AI tools, claims, verification, and Security Officer services are never tied to payment.</p>
      <div style={{ marginTop: 18, padding: 16, borderRadius: 12, background: 'var(--surface-muted)', border: '1px solid var(--border)' }}>
        <span className="text-secondary text-sm">Payment number for bKash and Nagad</span>
        <strong style={{ display: 'block', marginTop: 4, fontSize: '1.25rem', letterSpacing: '.04em' }}>{SUPPORT_PAYMENT_NUMBER}</strong>
        <span className="text-secondary text-sm">You will complete the payment directly on the provider’s official site.</span>
      </div>
      {availability?.isManualSupport && <Alert type="info">Send your contribution securely in your own bKash or Nagad app. CampusFind will never ask for your PIN, OTP, or wallet password.</Alert>}
      {error && <Alert type="error">{error}</Alert>}
      <h2 style={{ marginTop: 24 }}>Choose an amount</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        {SUGGESTED.map(item => <button key={item.amount} type="button" onClick={() => { setAmount(item.amount); setCustomAmount(''); }} className="card" style={{ padding: 16, textAlign: 'left', cursor: 'pointer', border: selectedAmount === item.amount && !customAmount ? '2px solid var(--primary)' : '1px solid var(--border)', background: 'white' }}><strong style={{ display: 'block', fontSize: '1.25rem' }}>৳{item.amount}</strong><span className="text-secondary text-sm">{item.label}</span></button>)}
      </div>
      <label style={{ display: 'block', marginTop: 16, maxWidth: 280 }}>Custom Amount (৳)<input type="number" min={availability?.minimumAmount} max={availability?.maximumAmount} step="1" value={customAmount} onChange={event => setCustomAmount(event.target.value)} placeholder={`৳${availability?.minimumAmount || 10}–৳${availability?.maximumAmount || 5000}`} /></label>
      {customAmount && !validAmount && <p className="text-sm" style={{ color: 'var(--danger)' }}>Choose an amount from ৳{availability.minimumAmount} to ৳{availability.maximumAmount}.</p>}
      <h2 style={{ marginTop: 28 }}>Choose payment method</h2>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <ProviderButton label="bKash" selected={provider === 'bkash'} onClick={() => setProvider('bkash')} />
        <ProviderButton label="Nagad" selected={provider === 'nagad'} onClick={() => setProvider('nagad')} />
      </div>
      {provider && validAmount && <div style={{ marginTop: 24, padding: 16, background: 'var(--surface-muted)', borderRadius: 12 }}><strong>Amount: ৳{selectedAmount}</strong><br /><span className="text-secondary">Payment method: {provider === 'bkash' ? 'bKash' : 'Nagad'}</span><p className="text-secondary text-sm" style={{ margin: '12px 0 0' }}>The provider will open in a new tab, so this page and the payment number remain available. CampusFind never asks for your PIN, OTP, or wallet password.</p></div>}
      <button className="btn btn-primary btn-lg" style={{ marginTop: 20 }} onClick={continuePayment} disabled={!validAmount || !provider}>{`Continue to ${provider === 'bkash' ? 'bKash' : provider === 'nagad' ? 'Nagad' : 'a provider'}`}</button>
    </div>
    <section><h2>My Support History</h2>{history.length === 0 ? <EmptyState title="No support payments yet" message="If you ever choose to support CampusFind, your contribution history will appear here." /> : <div className="card" style={{ overflowX: 'auto' }}><table className="data-table"><thead><tr><th>Date</th><th>Amount</th><th>Provider</th><th>Status</th><th>Reference</th></tr></thead><tbody>{history.map(payment => <tr key={payment.id}><td>{formatBangladeshDate(payment.createdAt, { year: 'numeric', month: 'short', day: 'numeric' })}</td><td>৳{payment.amount}</td><td>{payment.provider}</td><td>{payment.status}</td><td>{payment.providerTransactionId || payment.merchantInvoiceNumber}</td></tr>)}</tbody></table></div>}</section>
  </section>;
}

function ProviderButton({ label, selected, onClick }) { return <button type="button" className="card" onClick={onClick} style={{ minWidth: 150, padding: 16, cursor: 'pointer', border: selected ? '2px solid var(--primary)' : '1px solid var(--border)', background: 'white' }}><strong>{label}</strong><span style={{ display: 'block', fontSize: '.8rem', marginTop: 4 }}>Open official site</span></button>; }
