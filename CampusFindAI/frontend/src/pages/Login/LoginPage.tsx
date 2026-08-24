import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { getApiError } from '../../services/apiError';
import { Notice } from '../../components/Notice';

export function LoginPage() {
  const { setAuth } = useAuth(); const navigate = useNavigate();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setLoading(true);
    try {
      const response = await authService.login({ email: email.trim(), password }); setAuth(response);
      navigate(['SecurityOfficer', 'Administrator'].includes(response.user.role) ? '/security/login-confirmation' : '/dashboard');
    } catch (error) { setError(getApiError(error, 'Login failed. Check your email and password.')); }
    finally { setLoading(false); }
  }
  return <main className="auth-page"><section className="auth-card">
    <p className="eyebrow">CampusFind AI</p><h1>Welcome back</h1><p className="muted">Sign in to report, browse, and reclaim campus items.</p>
    <form onSubmit={handleSubmit}>
      <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" required placeholder="you@university.edu" /></label>
      <label>Password<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" required /></label>
      <button className="button" disabled={loading} type="submit">{loading ? 'Signing in...' : 'Sign in'}</button>
      {error && <Notice>{error}</Notice>}
    </form><p>Need an account? <Link to="/register">Register</Link></p>
  </section></main>;
}
