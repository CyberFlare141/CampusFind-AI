import { apiClient } from './apiClient';

export interface CreateLostItemRequest {
  title: string;
  description?: string;
  lostAt?: string;
  categoryId?: string | null;
  locationId?: string | null;
}

export interface LostItem {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  lostAt?: string | null;
  categoryId?: string | null;
  locationId?: string | null;
  status: string;
  createdAt: string;
}

export async function createLostItem(
  request: CreateLostItemRequest
): Promise<LostItem> {
  const response = await apiClient.post<LostItem>(
    '/LostItems',
    request
  );

  return response.data;
}

export async function getMyLostItems(): Promise<LostItem[]> {
  const response = await apiClient.get<LostItem[]>(
    '/LostItems/my'
  );

  return response.data;
}

export async function getLostItemById(
  id: string
): Promise<LostItem> {
  const response = await apiClient.get<LostItem>(
    `/LostItems/${id}`
  );

  return response.data;
}

export async function getAllLostItems(): Promise<LostItem[]> {
  const response = await apiClient.get<LostItem[]>(
    '/LostItems'
  );

  return response.data;
}