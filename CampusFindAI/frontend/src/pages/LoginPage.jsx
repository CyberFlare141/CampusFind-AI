import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Alert, ButtonSpinner } from '../components/Ui';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    if (!validate()) return;
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      const redirectTo = location.state?.from?.pathname || '/';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      {/* ── Left panel — brand hero ─────────────────────────── */}
      <div className="auth-panel">
        {/* Floating decoration blobs */}
        <motion.div
          style={{
            position: 'absolute', width: 200, height: 200, borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)', bottom: 80, left: 40, zIndex: 0,
          }}
          animate={{ y: [0, -16, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          style={{
            position: 'absolute', width: 120, height: 120, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)', top: 120, right: 30, zIndex: 0,
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
            <span className="brand-mark">🔍</span>
            <span className="brand-name">CampusFind AI</span>
          </div>

          <h1 className="auth-hero-title">
            Reuniting your campus<br />with what it's lost.
          </h1>
          <p className="auth-hero-copy">
            Report lost belongings, browse found items, and let AI match you with your lost property — all in one place.
          </p>

          {/* Feature pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 32 }}>
            {['✦ AI Smart Matching', '📍 Campus-wide search', '🔒 Secure claims'].map((f, i) => (
              <motion.span
                key={f}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  padding: '0.35rem 0.75rem',
                  borderRadius: 999,
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.20)',
                }}
              >
                {f}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Right panel — login form ────────────────────────── */}
      <div className="auth-card-wrap">
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        >
          <span className="eyebrow">Welcome back</span>
          <h1 style={{ fontSize: '1.6rem', marginBottom: 4 }}>Sign in</h1>
          <p className="text-muted text-sm" style={{ marginBottom: 24 }}>
            Sign in with your campus email to continue.
          </p>

          <Alert type="error">{formError}</Alert>

          <form onSubmit={handleSubmit} noValidate style={{ display: 'grid', gap: 16 }}>
            <div className="form-field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldErrors.email ? 'input-error' : ''}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              />
              {fieldErrors.email && (
                <span id="email-error" className="field-error">{fieldErrors.email}</span>
              )}
            </div>

            <div className="form-field">
              <label htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={fieldErrors.password ? 'input-error' : ''}
                  style={{ paddingRight: '2.8rem' }}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', fontSize: '0.85rem', padding: 4,
                  }}
                >
                  {showPassword ? '🙈' : '👁️'}
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
              style={{ marginTop: 4 }}
            >
              {submitting && <ButtonSpinner />}
              {submitting ? 'Signing in…' : 'Sign in'}
            </motion.button>
          </form>

          <p className="text-sm text-muted" style={{ marginTop: 20, textAlign: 'center' }}>
            Don&apos;t have an account?{' '}
            <Link to="/register" style={{ color: 'var(--primary-deep)', fontWeight: 600 }}>
              Create one
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
