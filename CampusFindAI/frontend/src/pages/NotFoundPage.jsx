import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 24px',
      background: 'var(--bg)',
      textAlign: 'center',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="card card-pad-lg"
        style={{ maxWidth: 480, width: '100%' }}
      >
        <div style={{
          width: 72, height: 72,
          borderRadius: 'var(--radius-xl)',
          background: 'rgba(143, 162, 138, 0.16)',
          border: '1.5px dashed rgba(143, 162, 138, 0.40)',
          display: 'grid', placeItems: 'center',
          margin: '0 auto 20px',
          color: 'var(--primary-deep)',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
        <span className="eyebrow">404 Error</span>
        <h1 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.3rem)', marginBottom: 8 }}>
          Page Not Found
        </h1>
        <p className="text-secondary" style={{ maxWidth: 360, margin: '0 auto 28px', fontSize: '0.95rem' }}>
          We looked across the campus database, but this page seems to be lost. Let&apos;s guide you back.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            <Link to="/" className="btn btn-primary btn-lg">Return to Dashboard</Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
            <Link to="/lost-items" className="btn btn-secondary btn-lg">Browse Lost Items</Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
