import { apiRequest } from './client';
export const getMyReputation = () => apiRequest('/reputation/mine');
export const getLeaderboard = () => apiRequest('/reputation/leaderboard', { auth: false });
