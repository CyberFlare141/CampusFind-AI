import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { resendConfirmation } from '../api/auth';
import {Alert, ButtonSpinner, AuthCellularDecor } from '../components/Ui';

export default function VerificationPendingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || '';
  const maskedEmail = location.state?.maskedEmail || (email ? email.replace(/^(.{2})(.*)(@.*)$/, '$1***$3') : 'your university email');

  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState('');
  const [resendError, setResendError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleResend() {
    if (!email || cooldown > 0 || resending) return;
    setResending(true);
    setResendStatus('');
    setResendError('');
    try {
      const response = await resendConfirmation({ email });
      setResendStatus(response?.message || 'A new verification link has been sent to your email.');
      setCooldown(60);
    } catch (err) {
      setResendError(err.message || 'Could not send verification email. Please try again later.');
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
            Verify your<br />institutional identity.
          </h1>
          <p className="auth-hero-copy">
            CampusFind AI ensures trust and security across campus by verifying official student and faculty emails.
          </p>
        </motion.div>
      </div>

      {/* ── Right Card: Verification Pending ────────────────── */}
      <div className="auth-card-wrap">
        <AuthCellularDecor variant="canvas" />
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          style={{ textAlign: 'center' }}
        >
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: 'rgba(49,94,84,0.12)',
            display: 'grid', placeItems: 'center', margin: '0 auto 16px', color: 'var(--primary-deep)',
            border: '1px solid rgba(49,94,84,0.22)',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>

          <span className="eyebrow">Action Required</span>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 8 }}>Check your inbox</h1>
          <p className="text-secondary text-sm" style={{ marginBottom: 20, lineHeight: 1.6 }}>
            We sent a verification link to <strong>{maskedEmail}</strong>. Click the link in the email to activate your account.
          </p>

          <Alert type="success">{resendStatus}</Alert>
          <Alert type="error">{resendError}</Alert>

          <div style={{ display: 'grid', gap: 12, marginTop: 24 }}>
            {email && (
              <button
                type="button"
                className="btn btn-secondary btn-block"
                disabled={resending || cooldown > 0}
                onClick={handleResend}
              >
                {resending && <ButtonSpinner />}
                {resending
                  ? 'Sending email…'
                  : cooldown > 0
                  ? `Resend available in ${cooldown}s`
                  : 'Resend verification email'}
              </button>
            )}

            <Link to="/login" className="btn btn-primary btn-block">
              Go to Sign In
            </Link>
          </div>

          <p className="text-xs text-muted" style={{ marginTop: 24 }}>
            Did not receive the email? Check your spam/junk folder or ensure your university inbox is active.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

