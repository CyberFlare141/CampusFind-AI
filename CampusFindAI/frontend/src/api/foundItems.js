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

export function createFoundItem({ title, description, privateVerificationDetails, foundAt, categoryId, locationDetails, images = [] }) {
  const body = new FormData();
  body.append('title', title);
  if (description) body.append('description', description);
  if (privateVerificationDetails) body.append('privateVerificationDetails', privateVerificationDetails);
  if (foundAt) body.append('foundAt', foundAt);
  if (categoryId) body.append('categoryId', categoryId);
  if (locationDetails) body.append('locationDetails', locationDetails);
  images.forEach((image) => body.append('images', image));
  return apiRequest('/founditems', {
    method: 'POST',
    body,
  });
}
