import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { forgotPassword } from '../api/auth';
import { Alert, ButtonSpinner } from '../components/Ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverMessage, setServerMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setFieldError('');
    setError('');

    if (!email.trim()) {
      setFieldError('Email is required.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setFieldError('Enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await forgotPassword({ email: email.trim() });
      setServerMessage(
        response?.message || 'If an account exists for that email, password reset instructions have been sent.'
      );
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Could not process password reset request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      {/* ── Left Hero Panel ─────────────────────────────────── */}
      <div className="auth-panel">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <div className="auth-brand">
            <span className="brand-mark">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7"/><path d="M11 8v3l2 2"/><line x1="16.5" y1="16.5" x2="21" y2="21"/>
              </svg>
            </span>
            <span className="brand-name">CampusFind AI</span>
          </div>

          <h1 className="auth-hero-title">
            Secure Account<br />Recovery
          </h1>
          <p className="auth-hero-copy">
            Reset your password securely via your verified institutional email account.
          </p>
        </motion.div>
      </div>

      {/* ── Right Card: Forgot Password ─────────────────────── */}
      <div className="auth-card-wrap">
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        >
          <span className="eyebrow">Password Assistance</span>
          <h1 style={{ fontSize: '1.8rem', marginBottom: 6 }}>Forgot Password</h1>
          <p className="text-muted text-sm" style={{ marginBottom: 24 }}>
            Enter your registered university email address and we will send you a secure password reset link.
          </p>

          <Alert type="error">{error}</Alert>

          {submitted ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: 'rgba(49,94,84,0.12)',
                display: 'grid', placeItems: 'center', margin: '0 auto 16px', color: 'var(--primary-deep)',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <h2 style={{ fontSize: '1.3rem', marginBottom: 8 }}>Instructions Sent</h2>
              <p className="text-secondary text-sm" style={{ lineHeight: 1.6, marginBottom: 24 }}>
                {serverMessage}
              </p>
              <Link to="/login" className="btn btn-primary btn-block">
                Return to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate style={{ display: 'grid', gap: 18 }}>
              <div className="form-field">
                <label htmlFor="forgot-email">University Email Address</label>
                <input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={fieldError ? 'input-error' : ''}
                  autoFocus
                />
                {fieldError && <span className="field-error">{fieldError}</span>}
              </div>

              <motion.button
                type="submit"
                className="btn btn-primary btn-block btn-lg"
                disabled={submitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                style={{ marginTop: 6 }}
              >
                {submitting && <ButtonSpinner />}
                {submitting ? 'Sending instructions…' : 'Send Reset Link'}
              </motion.button>

              <p className="text-sm text-muted" style={{ marginTop: 20, textAlign: 'center' }}>
                Remember your password?{' '}
                <Link to="/login" style={{ color: 'var(--primary-deep)', fontWeight: 700 }}>
                  Back to Sign In
                </Link>
              </p>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}

