import { apiRequest } from './client';
export const getPendingOwnershipReviews = () => apiRequest('/security/ownership-verifications/pending');
export const approveOwnershipReview = (id, reviewNote) => apiRequest(`/security/ownership-verifications/${id}/approve`, { method: 'POST', body: { reviewNote } });
export const rejectOwnershipReview = (id, reviewNote) => apiRequest(`/security/ownership-verifications/${id}/reject`, { method: 'POST', body: { reviewNote } });
