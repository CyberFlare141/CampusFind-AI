import { useEffect, useState } from 'react';
import { SecurityNav } from '../../components/SecurityNav';
import { getLoginConfirmation } from '../../services/securityService';
import type { LoginConfirmation } from '../../types/security';

export function LoginConfirmationPage() {
  const [confirmation, setConfirmation] = useState<LoginConfirmation | null>(
    null
  );
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await getLoginConfirmation();
        setConfirmation(data);
      } catch {
        setMessage('Could not confirm your login session.');
      }
    }

    load();
  }, []);

  return (
    <main className="wide-main">
      <h1>Login Confirmation</h1>
      <SecurityNav />

      {message && <p role="alert">{message}</p>}

      {confirmation && (
        <div className="detail-card">
          <p>
            You are signed in as <strong>{confirmation.email}</strong> (
            {confirmation.role}).
          </p>
          <p>
            <strong>Session confirmed:</strong>{' '}
            {new Date(confirmation.confirmedAt).toLocaleString()}
          </p>
          <p>
            <strong>Previous login:</strong>{' '}
            {confirmation.lastLoginAt
              ? new Date(confirmation.lastLoginAt).toLocaleString()
              : 'This is your first recorded login.'}
          </p>
        </div>
      )}
    </main>
  );
}
