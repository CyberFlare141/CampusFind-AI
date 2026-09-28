import { Link, useSearchParams } from 'react-router-dom';

export default function SupportAwaitingConfirmationPage() {
  const [params] = useSearchParams(); const id = params.get('id');
  return <section className="page-container-form"><div className="card card-pad-lg" style={{ textAlign: 'center' }}><span className="eyebrow">Support CampusFind</span><h1>Thank you for your support ☕</h1><p className="text-secondary">Your transaction reference has been recorded and is awaiting confirmation. This does not affect any CampusFind features.</p>{id && <p className="hint">Support reference: {id}</p>}<div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 24, flexWrap: 'wrap' }}><Link className="btn btn-primary" to="/support">View Support History</Link><Link className="btn btn-secondary" to="/">Back to CampusFind</Link></div></div></section>;
}
