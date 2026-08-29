import { apiRequest } from './client';

// Matches AuthController.cs exactly: POST /api/auth/register, POST /api/auth/login
// Request bodies match RegisterDto / LoginDto. Response matches AuthResponseDto.

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
