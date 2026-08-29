import { apiRequest } from './client';

export function getProfile() {
  return apiRequest('/profile');
}

export function updateProfile(profile) {
  return apiRequest('/profile', { method: 'PUT', body: profile });
}

export function changePassword({ currentPassword, newPassword }) {
  return apiRequest('/profile/password', {
    method: 'PUT',
    body: { currentPassword, newPassword },
  });
}
