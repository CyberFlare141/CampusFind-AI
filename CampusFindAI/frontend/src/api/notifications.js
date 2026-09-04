import { apiRequest } from './client';

export function getNotifications() {
  return apiRequest('/notifications');
}

export function markNotificationRead(id) {
  return apiRequest(`/notifications/${id}/read`, { method: 'PUT' });
}
