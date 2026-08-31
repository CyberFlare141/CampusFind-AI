import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Alert, ButtonSpinner } from '../components/Ui';

// Mirrors backend password policy in IdentityExtensions.cs
function validatePassword(password) {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[0-9]/.test(password)) return 'Password must include at least one digit.';
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter.';
  return null;
}

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const errors = {};
    if (!email.trim()) errors.email = 'Email is required.';
    else if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Enter a valid email address.';
    const passwordIssue = validatePassword(password);
    if (passwordIssue) errors.password = passwordIssue;
    if (confirmPassword !== password) errors.confirmPassword = 'Passwords do not match.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      await register(email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      {/* ── Left panel ────────────────────────────────────────── */}
      <div className="auth-panel">
        <motion.div
          style={{ position: 'absolute', width: 250, height: 250, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', bottom: 40, right: -60, zIndex: 0 }}
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          style={{ position: 'absolute', width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', top: 60, right: 80, zIndex: 0 }}
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />

        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <div className="auth-brand">
            <span className="brand-mark">🔍</span>
            <span className="brand-name">CampusFind AI</span>
          </div>
          <h1 className="auth-hero-title">Never lose track of<br />what matters.</h1>
          <p className="auth-hero-copy">
            Create an account to report a lost item, log something you found, or track the status of your claim.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 32 }}>
            {[
              { icon: '🔍', text: 'AI automatically matches lost & found reports' },
              { icon: '🔒', text: 'Secure ownership verification before handover' },
              { icon: '🏅', text: 'Earn trust points for returning items' },
            ].map((f, i) => (
              <motion.div
                key={f.icon}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.12 }}
                style={{ display: 'flex', alignItems: 'center', gap: 10 }}
              >
                <span style={{ fontSize: '1.1rem' }}>{f.icon}</span>
                <span style={{ color: 'rgba(255,255,255,0.80)', fontSize: '0.88rem' }}>{f.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Right panel — register form ─────────────────────── */}
      <div className="auth-card-wrap">
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        >
          <span className="eyebrow">Get started</span>
          <h1 style={{ fontSize: '1.6rem', marginBottom: 4 }}>Create your account</h1>
          <p className="text-muted text-sm" style={{ marginBottom: 24 }}>
            New accounts are registered as students by default.
          </p>

          <Alert type="error">{formError}</Alert>

          <form onSubmit={handleSubmit} noValidate style={{ display: 'grid', gap: 16 }}>
            <div className="form-field">
              <label htmlFor="reg-email">Email address</label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldErrors.email ? 'input-error' : ''}
                aria-describedby={fieldErrors.email ? 'reg-email-error' : undefined}
              />
              {fieldErrors.email && <span id="reg-email-error" className="field-error">{fieldErrors.email}</span>}
            </div>

            <div className="form-field">
              <label htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={fieldErrors.password ? 'input-error' : ''}
              />
              {fieldErrors.password ? (
                <span className="field-error">{fieldErrors.password}</span>
              ) : (
                <span className="hint">At least 8 characters, with uppercase, lowercase, and a digit.</span>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="reg-confirmPassword">Confirm password</label>
              <input
                id="reg-confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={fieldErrors.confirmPassword ? 'input-error' : ''}
              />
              {fieldErrors.confirmPassword && <span className="field-error">{fieldErrors.confirmPassword}</span>}
            </div>

            <motion.button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={submitting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              style={{ marginTop: 4 }}
            >
              {submitting && <ButtonSpinner />}
              {submitting ? 'Creating account…' : 'Create account'}
            </motion.button>
          </form>

          <p className="text-sm text-muted" style={{ marginTop: 20, textAlign: 'center' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--primary-deep)', fontWeight: 600 }}>Sign in</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
