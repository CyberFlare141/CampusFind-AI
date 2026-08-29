import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="page-container page-container-narrow">
      <div className="empty-state card" style={{ marginTop: 40 }}>
        <div className="icon">{'\u{1F9ED}'}</div>
        <h3>Page not found</h3>
        <p>The page you&apos;re looking for doesn&apos;t exist or may have moved.</p>
        <Link to="/" className="btn btn-primary btn-sm">Back to Dashboard</Link>
      </div>
    </div>
  );
}
