import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { resendConfirmation } from '../api/auth';
import { Alert, ButtonSpinner } from '../components/Ui';
import { GoogleSignInButton } from '../components/GoogleSignInButton';

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Unverified email handler state
  const [isUnverified, setIsUnverified] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState('');
  const [isLockedOut, setIsLockedOut] = useState(false);

  function validate() {
    const errors = {};
    if (!email.trim()) errors.email = 'Email is required.';
    else if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Enter a valid email address.';
    if (!password) errors.password = 'Password is required.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setIsUnverified(false);
    setIsLockedOut(false);
    setResendStatus('');

    if (!validate()) return;
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      const redirectTo = location.state?.from?.pathname || '/';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const msg = err.message || 'Invalid email or password.';
      setFormError(msg);

      if (msg.toLowerCase().includes('not been verified') || msg.toLowerCase().includes('email verification')) {
        setIsUnverified(true);
      }
      if (msg.toLowerCase().includes('locked') || msg.toLowerCase().includes('lockout') || msg.toLowerCase().includes('too many unsuccessful')) {
        setIsLockedOut(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSuccess(idToken) {
    setFormError('');
    setIsUnverified(false);
    setIsLockedOut(false);
    setResendStatus('');
    try {
      await loginWithGoogle(idToken);
      const redirectTo = location.state?.from?.pathname || '/';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setFormError(err.message || 'Google sign-in failed.');
    }
  }

  async function handleResendVerification() {
    if (!email.trim() || resending) return;
    setResending(true);
    setResendStatus('');
    try {
      const res = await resendConfirmation({ email: email.trim() });
      setResendStatus(res?.message || 'Verification email dispatched. Please check your inbox.');
    } catch (err) {
      setResendStatus(err.message || 'Could not send verification email. Please try again later.');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="auth-shell">
      {/* ── Left Hero Panel ─────────────────────────────────── */}
      <div className="auth-panel">
        <motion.div
          style={{
            position: 'absolute', width: 220, height: 220, borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)', bottom: 80, left: 40, zIndex: 0,
          }}
          animate={{ y: [0, -16, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          style={{
            position: 'absolute', width: 140, height: 140, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)', top: 120, right: 40, zIndex: 0,
          }}
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />

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
            Reuniting your campus<br />with what was lost.
          </h1>
          <p className="auth-hero-copy">
            Report lost belongings, browse found items, and let AI cross-reference records across all campus buildings in real time.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 36 }}>
            {['✦ AI Smart Matching', '📍 Campus Wide Index', '🔒 Verified Claim Handover'].map((f, i) => (
              <motion.span
                key={f}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.1 }}
                style={{
                  background: 'rgba(255,255,255,0.18)',
                  color: 'rgba(255,255,255,0.95)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  padding: '0.4rem 0.85rem',
                  borderRadius: 999,
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                {f}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Right Panel: Sign In Form ───────────────────────── */}
      <div className="auth-card-wrap">
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        >
          <span className="eyebrow">Welcome Back</span>
          <h1 style={{ fontSize: '1.8rem', marginBottom: 6 }}>Sign in</h1>
          <p className="text-muted text-sm" style={{ marginBottom: 26 }}>
            Sign in with your campus email credentials to continue.
          </p>

          <Alert type="error">{formError}</Alert>
          {resendStatus && <Alert type="success">{resendStatus}</Alert>}

          {isUnverified && (
            <div style={{
              background: 'rgba(200, 169, 107, 0.12)', border: '1px solid rgba(200, 169, 107, 0.35)',
              borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 18,
            }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                Haven&apos;t received your verification link?
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleResendVerification}
                disabled={resending}
              >
                {resending && <ButtonSpinner />}
                {resending ? 'Sending…' : 'Resend Verification Email'}
              </button>
            </div>
          )}

          {isLockedOut && (
            <div style={{
              background: 'rgba(211, 47, 47, 0.08)', border: '1px solid rgba(211, 47, 47, 0.25)',
              borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 18,
            }}>
              <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: 8 }}>
                You can wait for the lockout period to expire or reset your password now:
              </div>
              <Link to="/forgot-password" className="btn btn-secondary btn-sm">
                Reset Password
              </Link>
            </div>
          )}

          {/* Google Authentication Option */}
          <div style={{ marginBottom: 18 }}>
            <GoogleSignInButton
              onCredentialReceived={handleGoogleSuccess}
              onError={(msg) => setFormError(msg)}
              disabled={submitting}
              text="Continue with Google"
            />
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 20,
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            <span style={{ padding: '0 12px' }}>or continue with email</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>

          <form onSubmit={handleSubmit} noValidate style={{ display: 'grid', gap: 18 }}>
            <div className="form-field">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldErrors.email ? 'input-error' : ''}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                autoFocus
              />
              {fieldErrors.email && (
                <span id="email-error" className="field-error">{fieldErrors.email}</span>
              )}
            </div>

            <div className="form-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label htmlFor="password" style={{ margin: 0 }}>Password</label>
                <Link
                  to="/forgot-password"
                  style={{ fontSize: '0.82rem', color: 'var(--primary-deep)', fontWeight: 600 }}
                >
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={fieldErrors.password ? 'input-error' : ''}
                  style={{ paddingRight: '3rem' }}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', display: 'grid', placeItems: 'center',
                  }}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <span id="password-error" className="field-error">{fieldErrors.password}</span>
              )}
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
              {submitting ? 'Signing in…' : 'Sign in'}
            </motion.button>
          </form>

          <p className="text-sm text-muted" style={{ marginTop: 24, textAlign: 'center' }}>
            Don&apos;t have an account?{' '}
            <Link to="/register" style={{ color: 'var(--primary-deep)', fontWeight: 700 }}>
              Create an account
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
