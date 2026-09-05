import { apiRequest } from './client';

// Matches LostItemsController.cs exactly.
// CreateLostItemDto: { title, description?, lostAt?, categoryId?, locationId? }
// LostItemDto: { id, userId, title, description, lostAt, categoryId, locationId, status, createdAt }

export function getAllLostItems() {
  return apiRequest('/lostitems');
}

export function getMyLostItems() {
  return apiRequest('/lostitems/my');
}

export function getLostItemById(id) {
  return apiRequest(`/lostitems/${id}`);
}

export function createLostItem({ title, description, lostAt, categoryId, locationDetails, images = [] }) {
  const body = new FormData();
  body.append('title', title);
  if (description) body.append('description', description);
  if (lostAt) body.append('lostAt', lostAt);
  if (categoryId) body.append('categoryId', categoryId);
  if (locationDetails) body.append('locationDetails', locationDetails);
  images.forEach((image) => body.append('images', image));
  return apiRequest('/lostitems', {
    method: 'POST',
    body,
  });
}
