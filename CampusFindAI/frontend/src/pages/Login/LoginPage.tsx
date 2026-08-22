import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

export function LoginPage() {
  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login({ email, password });
      setAuth(response);

      const isSecurityStaff =
        response.user.role === 'SecurityOfficer' ||
        response.user.role === 'Administrator';

      navigate(isSecurityStaff ? '/security/login-confirmation' : '/dashboard');
    } catch {
      setError('Login failed. Check your email and password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>CampusFind AI — Login</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
        </label>
        <label>
          Password
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
        </label>
        <button disabled={loading} type="submit">
          {loading ? 'Signing in...' : 'Login'}
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
      <p>
        Need an account? <Link to="/register">Register</Link>
      </p>
    </main>
  );
}
