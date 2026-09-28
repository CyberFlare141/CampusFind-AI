import { apiRequest } from './client';

export const getSupportPaymentAvailability = () => apiRequest('/support-payments/availability');
export const createSupportPayment = (amount, provider) => apiRequest('/support-payments', { method: 'POST', body: { amount, provider } });
export const getMySupportPayments = () => apiRequest('/support-payments/my');
export const getSupportPayment = id => apiRequest(`/support-payments/${id}`);
export const simulateSupportPayment = (id, outcome) => apiRequest(`/support-payments/${id}/simulate/${outcome}`, { method: 'POST' });
export const submitManualSupportReference = (id, transactionReference) => apiRequest(`/support-payments/${id}/manual-reference`, { method: 'POST', body: { transactionReference } });
export const getAdminSupportPayments = () => apiRequest('/admin/support-payments');
