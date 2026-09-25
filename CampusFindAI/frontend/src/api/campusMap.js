import { apiRequest } from './client';
export const getMapItems = (filters = {}) => {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
  return apiRequest(`/campus-map/items${query.size ? `?${query}` : ''}`);
};
export const getMapHotspots = () => apiRequest('/campus-map/hotspots');
