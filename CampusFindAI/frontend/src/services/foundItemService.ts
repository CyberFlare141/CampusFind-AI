import { apiClient } from './apiClient';

export interface CreateFoundItemRequest {
  title: string;
  description?: string;
  foundAt?: string;
  categoryId?: string | null;
  locationId?: string | null;
}

export interface FoundItem {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  foundAt?: string | null;
  categoryId?: string | null;
  locationId?: string | null;
}

export async function createFoundItem(
  request: CreateFoundItemRequest
): Promise<FoundItem> {
  const response = await apiClient.post<FoundItem>(
    '/FoundItems',
    request
  );

  return response.data;
}

export async function getMyFoundItems(): Promise<FoundItem[]> {
  const response = await apiClient.get<FoundItem[]>(
    '/FoundItems/my'
  );

  return response.data;
}

export async function getFoundItemById(
  id: string
): Promise<FoundItem> {
  const response = await apiClient.get<FoundItem>(
    `/FoundItems/${id}`
  );

  return response.data;
}

export async function getAllFoundItems(): Promise<FoundItem[]> {
  const response = await apiClient.get<FoundItem[]>(
    '/FoundItems'
  );

  return response.data;
}