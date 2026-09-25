import { Link } from 'react-router-dom';

/** Legacy route kept as a safe pointer; it must never offer a catalogue claim form. */
export function ClaimsPage() {
  return <div className="content-grid"><section className="form-panel"><p className="eyebrow">Ownership verification</p><h1>Claims start from My AI Matches</h1><p className="muted">For your protection, select a potential match between one of your lost-item reports and a found item before starting a claim.</p><Link className="button" to="/my-matches">Open My AI Matches</Link></section></div>;
}
