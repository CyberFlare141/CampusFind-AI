import { useEffect, useState } from 'react';
import { SecurityNav } from '../../components/SecurityNav';
import { formatBangladeshDate } from '../../api/client';
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
            {formatBangladeshDate(confirmation.confirmedAt, { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
          <p>
            <strong>Previous login:</strong>{' '}
            {confirmation.lastLoginAt
              ? formatBangladeshDate(confirmation.lastLoginAt, { dateStyle: 'medium', timeStyle: 'short' })
              : 'This is your first recorded login.'}
          </p>
        </div>
      )}
    </main>
  );
}
