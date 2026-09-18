import { apiRequest } from './client';

export const getChatConversations = () => apiRequest('/chat/conversations');
export const getChatMessages = (id) => apiRequest(`/chat/conversations/${id}/messages`);
export const deleteChatConversation = (id) => apiRequest(`/chat/conversations/${id}`, { method: 'DELETE' });
export const clearChatHistory = () => apiRequest('/chat/conversations', { method: 'DELETE' });
export const sendChatMessage = ({ conversationId, message }) => apiRequest('/chat/messages', { method: 'POST', body: { conversationId, message } });
