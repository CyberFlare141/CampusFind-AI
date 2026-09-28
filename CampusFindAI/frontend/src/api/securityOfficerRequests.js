import { apiRequest } from './client';

export const getMySecurityOfficerRequest = () => apiRequest('/security-officer-requests/mine');
export const submitSecurityOfficerRequest = (request) => apiRequest('/security-officer-requests', { method: 'POST', body: request });
export const getSecurityOfficerRequests = () => apiRequest('/security-officer-requests');
export const approveSecurityOfficerRequest = (id, adminNotes) => apiRequest(`/security-officer-requests/${id}/approve`, { method: 'POST', body: { adminNotes } });
export const rejectSecurityOfficerRequest = (id, adminNotes) => apiRequest(`/security-officer-requests/${id}/reject`, { method: 'POST', body: { adminNotes } });
