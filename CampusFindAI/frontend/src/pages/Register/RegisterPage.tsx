import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { getApiError } from '../../services/apiError';
import { Notice } from '../../components/Notice';

export function RegisterPage() {
  const { setAuth } = useAuth(); const navigate = useNavigate();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setError(''); setLoading(true);
    try { const response = await authService.register({ email: email.trim(), password }); setAuth(response); navigate('/dashboard', { replace: true }); }
    catch (error) { setError(getApiError(error, 'Registration failed. Please try again.')); }
    finally { setLoading(false); }
  }
  return <main className="auth-page"><section className="auth-card">
    <p className="eyebrow">CampusFind AI</p><h1>Create your account</h1><p className="muted">Join your campus lost-and-found community.</p>
    <form onSubmit={handleSubmit}>
      <label>Email<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@university.edu" /></label>
      <label>Password<input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="At least 6 characters" /></label>
      <label>Confirm password<input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></label>
      <button className="button" disabled={loading} type="submit">{loading ? 'Creating account...' : 'Create account'}</button>{error && <Notice>{error}</Notice>}
    </form><p>Already registered? <Link to="/login">Sign in</Link></p>
  </section></main>;
}
