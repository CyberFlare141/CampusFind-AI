import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { confirmEmail, resendConfirmation } from '../api/auth';
import {Alert, ButtonSpinner, AuthCellularDecor } from '../components/Ui';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId');
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Resend state if token expired
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState('');
  const [showResendInput, setShowResendInput] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      if (!userId || !token) {
        setLoading(false);
        setErrorMessage('Verification link is incomplete or malformed.');
        return;
      }

      try {
        const response = await confirmEmail({ userId, token });
        if (!cancelled) {
          setSuccessMessage(response?.message || 'Your email address has been verified successfully!');
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(err.message || 'The verification link is invalid or has expired.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    verify();
    return () => { cancelled = true; };
  }, [userId, token]);

  async function handleResend(e) {
    e.preventDefault();
    if (!resendEmail.trim() || resending) return;
    setResending(true);
    setResendStatus('');
    try {
      const response = await resendConfirmation({ email: resendEmail.trim() });
      setResendStatus(response?.message || 'If an unverified account exists, a verification link has been sent.');
    } catch (err) {
      setResendStatus(err.message || 'Could not send verification email. Please try again.');
    } finally {
      setResending(false);
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
            Account<br />Verification
          </h1>
          <p className="auth-hero-copy">
            Securing access to official campus lost-and-found records through cryptographic token verification.
          </p>
        </motion.div>
      </div>

      {/* ── Right Card: Verification Handler ────────────────── */}
      <div className="auth-card-wrap">
        <AuthCellularDecor variant="canvas" />
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          style={{ textAlign: 'center' }}
        >
          {loading ? (
            <div style={{ padding: '40px 0' }}>
              <div style={{
                width: 48, height: 48, border: '3px solid var(--border)', borderTopColor: 'var(--primary)',
                borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite',
              }} />
              <h2 style={{ fontSize: '1.4rem', marginBottom: 6 }}>Verifying your email…</h2>
              <p className="text-muted text-sm">Please wait while we confirm your university credentials.</p>
            </div>
          ) : successMessage ? (
            <div>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', background: 'rgba(56, 142, 60, 0.14)',
                display: 'grid', placeItems: 'center', margin: '0 auto 16px', color: '#2e7d32',
                border: '1px solid rgba(56, 142, 60, 0.28)',
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <span className="eyebrow" style={{ color: '#2e7d32' }}>Success</span>
              <h1 style={{ fontSize: '1.75rem', marginBottom: 8 }}>Email Verified!</h1>
              <p className="text-secondary text-sm" style={{ marginBottom: 24, lineHeight: 1.6 }}>
                {successMessage}
              </p>
              <Link to="/login" className="btn btn-primary btn-block btn-lg">
                Sign In to CampusFind AI
              </Link>
            </div>
          ) : (
            <div>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', background: 'rgba(211, 47, 47, 0.12)',
                display: 'grid', placeItems: 'center', margin: '0 auto 16px', color: 'var(--danger)',
                border: '1px solid rgba(211, 47, 47, 0.22)',
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              </div>
              <span className="eyebrow" style={{ color: 'var(--danger)' }}>Verification Failed</span>
              <h1 style={{ fontSize: '1.75rem', marginBottom: 8 }}>Link Expired or Invalid</h1>
              <p className="text-secondary text-sm" style={{ marginBottom: 20, lineHeight: 1.6 }}>
                {errorMessage}
              </p>

              <Alert type="info">{resendStatus}</Alert>

              {!showResendInput ? (
                <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-block"
                    onClick={() => setShowResendInput(true)}
                  >
                    Request New Verification Link
                  </button>
                  <Link to="/login" className="btn btn-ghost btn-block">
                    Return to Sign In
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleResend} style={{ display: 'grid', gap: 14, marginTop: 18, textAlign: 'left' }}>
                  <div className="form-field">
                    <label htmlFor="resend-email">Enter your university email</label>
                    <input
                      id="resend-email"
                      type="email"
                      required
                      placeholder="you@university.edu"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-block" disabled={resending}>
                    {resending && <ButtonSpinner />}
                    {resending ? 'Sending…' : 'Send New Verification Link'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-block"
                    onClick={() => setShowResendInput(false)}
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

