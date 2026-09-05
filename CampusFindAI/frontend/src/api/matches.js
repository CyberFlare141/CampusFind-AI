import { apiRequest } from './client';
export const getMyMatches = () => apiRequest('/matches/my');
