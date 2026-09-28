import { apiRequest } from './client';

// Matches FoundItemsController.cs exactly.
// CreateFoundItemDto: { title, description?, foundAt?, categoryId?, locationId? }
// FoundItemDto: { id, userId, title, description, foundAt, categoryId, locationId }
// Note: unlike LostItemDto, FoundItemDto has no `status` or `createdAt` field on the backend.

export function getAllFoundItems() {
  return apiRequest('/founditems');
}

export function getMyFoundItems() {
  return apiRequest('/founditems/my');
}

export function getFoundItemById(id) {
  return apiRequest(`/founditems/${id}`);
}

export function getOwnershipVerificationQuestions() {
  return apiRequest('/founditems/ownership-verification/questions');
}

export function getFounderVerification(id) {
  return apiRequest(`/founditems/${id}/ownership-verification`);
}

export function saveFounderVerification(id, answers) {
  return apiRequest(`/founditems/${id}/ownership-verification`, { method: 'PUT', body: { answers } });
}

export function createFoundItem({ title, description, founderVerificationAnswers, foundAt, categoryId, locationDetails, images = [] }) {
  const body = new FormData();
  body.append('title', title);
  if (description) body.append('description', description);
  (founderVerificationAnswers || []).forEach((answer, index) => body.append(`founderVerificationAnswers[${index}]`, answer));
  if (foundAt) body.append('foundAt', foundAt);
  if (categoryId) body.append('categoryId', categoryId);
  if (locationDetails) body.append('locationDetails', locationDetails);
  images.forEach((image) => body.append('images', image));
  return apiRequest('/founditems', {
    method: 'POST',
    body,
  });
}

// Founder answers are intentionally omitted from ordinary report edits. The dedicated protected
// endpoint rejects changes once an active claim exists.
export function updateFoundItem(id, { title, description, foundAt, categoryId, locationDetails, images = [] }) {
  const body = new FormData();
  body.append('title', title);
  if (description) body.append('description', description);
  if (foundAt) body.append('foundAt', foundAt);
  if (categoryId) body.append('categoryId', categoryId);
  if (locationDetails) body.append('locationDetails', locationDetails);
  images.forEach(image => body.append('images', image));
  return apiRequest(`/founditems/${id}`, { method: 'PUT', body });
}
export const archiveFoundItem = id => apiRequest(`/founditems/${id}/archive`, { method: 'PATCH' });
export const reopenFoundItem = id => apiRequest(`/founditems/${id}/reopen`, { method: 'PATCH' });
export const deleteFoundItem = id => apiRequest(`/founditems/${id}`, { method: 'DELETE' });
