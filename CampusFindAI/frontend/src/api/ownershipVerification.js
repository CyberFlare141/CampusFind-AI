import { apiRequest } from './client';

export const getOwnershipVerificationStatus = (matchId) => apiRequest(`/ownership-verifications/matches/${matchId}/status`);
export const startOwnershipVerification = (matchId) => apiRequest(`/ownership-verifications/matches/${matchId}/start`, { method: 'POST' });
export const submitOwnershipVerification = (matchId, answers) => apiRequest(`/ownership-verifications/matches/${matchId}/submit`, { method: 'POST', body: { answers } });
