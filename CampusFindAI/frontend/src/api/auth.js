import { apiRequest } from './client';

/**
 * Public authentication and account recovery API client.
 * Connects directly to ASP.NET Core backend /api/auth endpoints.
 */

export function register({ email, password }) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });
}

export function login({ email, password }) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });
}

export function confirmEmail({ userId, token }) {
  return apiRequest('/auth/confirm-email', {
    method: 'POST',
    body: { userId, token },
    auth: false,
  });
}

export function resendConfirmation({ email }) {
  return apiRequest('/auth/resend-confirmation', {
    method: 'POST',
    body: { email },
    auth: false,
  });
}

export function forgotPassword({ email }) {
  return apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: { email },
    auth: false,
  });
}

export function resetPassword({ userId, token, newPassword }) {
  return apiRequest('/auth/reset-password', {
    method: 'POST',
    body: { userId, token, newPassword },
    auth: false,
  });
}
