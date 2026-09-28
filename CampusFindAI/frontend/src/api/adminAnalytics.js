import { apiRequest } from './client';
export const getAnalytics = (section, filters = {}) => {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
  return apiRequest(`/admin/analytics/${section}${query.size ? `?${query}` : ''}`);
};
