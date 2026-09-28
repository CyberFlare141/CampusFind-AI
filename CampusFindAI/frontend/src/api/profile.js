import { apiRequest } from './client';

export function getProfile() {
  return apiRequest('/profile');
}

export function updateProfile(profile) {
  return apiRequest('/profile', { method: 'PUT', body: profile });
}

export function uploadProfileAvatar(file) {
  const formData = new FormData();
  formData.append('file', file);

  return apiRequest('/profile/avatar', {
    method: 'POST',
    body: formData,
    auth: true,
  });
}

export function changePassword({ currentPassword, newPassword }) {
  return apiRequest('/profile/password', {
    method: 'PUT',
    body: { currentPassword, newPassword },
  });
}
