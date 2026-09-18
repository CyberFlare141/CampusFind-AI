import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { resetPassword } from '../api/auth';
import { Alert, ButtonSpinner } from '../components/Ui';

function validatePassword(password) {
  if (password.length < 8) return 'Password must be at least 8 characters long.';
  if (password.length > 20) return 'Password must be no more than 20 characters long.';
  if (!/[0-9]/.test(password)) return 'Password must include at least one digit.';
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter.';
  return null;
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId') || '';
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [formError, setFormError] = useState('');

  const isInvalidLink = !userId || !token;

  function validate() {
    const errors = {};
    const passIssue = validatePassword(password);
    if (passIssue) errors.password = passIssue;
    if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      const response = await resetPassword({
        userId,
        token,
        newPassword: password,
      });
      setSuccessMessage(
        response?.message || 'Your password has been reset successfully. You can now sign in with your new password.'
      );
    } catch (err) {
      setFormError(err.message || 'Could not reset password. The link may be expired or invalid.');
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
            Set a New<br />Password
          </h1>
          <p className="auth-hero-copy">
            Create a strong, unique password to safeguard your campus account and personal lost-and-found records.
          </p>
        </motion.div>
      </div>

      {/* ── Right Card: Reset Password ──────────────────────── */}
      <div className="auth-card-wrap">
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        >
          <span className="eyebrow">Account Security</span>
          <h1 style={{ fontSize: '1.8rem', marginBottom: 6 }}>Reset Password</h1>
          <p className="text-muted text-sm" style={{ marginBottom: 24 }}>
            Enter your new password below.
          </p>

          <Alert type="error">{formError}</Alert>

          {isInvalidLink ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <Alert type="error">
                The password reset link is incomplete or missing necessary verification parameters.
              </Alert>
              <Link to="/forgot-password" className="btn btn-primary btn-block" style={{ marginTop: 16 }}>
                Request New Reset Link
              </Link>
            </div>
          ) : successMessage ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: 'rgba(56, 142, 60, 0.14)',
                display: 'grid', placeItems: 'center', margin: '0 auto 16px', color: '#2e7d32',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h2 style={{ fontSize: '1.3rem', marginBottom: 8 }}>Password Updated!</h2>
              <p className="text-secondary text-sm" style={{ lineHeight: 1.6, marginBottom: 24 }}>
                {successMessage}
              </p>
              <Link to="/login" className="btn btn-primary btn-block btn-lg">
                Sign In with New Password
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate style={{ display: 'grid', gap: 18 }}>
              <div className="form-field">
                <label htmlFor="reset-new-password">New Password</label>
                <input
                  id="reset-new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={fieldErrors.password ? 'input-error' : ''}
                  autoFocus
                />
                {fieldErrors.password ? (
                  <span className="field-error">{fieldErrors.password}</span>
                ) : (
                  <span className="hint">At least 8 characters with uppercase, lowercase, and a digit.</span>
                )}
              </div>

              <div className="form-field">
                <label htmlFor="reset-confirm-password">Confirm New Password</label>
                <input
                  id="reset-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={fieldErrors.confirmPassword ? 'input-error' : ''}
                />
                {fieldErrors.confirmPassword && (
                  <span className="field-error">{fieldErrors.confirmPassword}</span>
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
                {submitting ? 'Resetting password…' : 'Update Password'}
              </motion.button>

              <p className="text-sm text-muted" style={{ marginTop: 20, textAlign: 'center' }}>
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

