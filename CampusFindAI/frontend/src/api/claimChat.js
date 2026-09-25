import { apiRequest } from './client';

export const openClaimChat = claimId => apiRequest(`/claims/${claimId}/chat`);
export const getClaimChatMessages = (claimId, before) => apiRequest(`/claims/${claimId}/chat/messages${before ? `?before=${encodeURIComponent(before)}` : ''}`);
export const sendClaimChatMessage = (claimId, content) => apiRequest(`/claims/${claimId}/chat/messages`, { method: 'POST', body: { content } });
export const markClaimChatRead = claimId => apiRequest(`/claims/${claimId}/chat/read`, { method: 'POST' });
export const getFounderClaimChats = foundItemId => apiRequest(`/founditems/${foundItemId}/claim-chats`);
