import { apiRequest } from './client';

export function getNotifications({ before, take = 20 } = {}) {
  const query = new URLSearchParams({ take: String(take) });
  if (before) query.set('before', before);
  return apiRequest(`/notifications?${query}`);
}

export function getUnreadNotificationCount() { return apiRequest('/notifications/unread-count'); }

export function markNotificationRead(id) {
  return apiRequest(`/notifications/${id}/read`, { method: 'PUT' });
}

export function markAllNotificationsRead() { return apiRequest('/notifications/read-all', { method: 'PUT' }); }
