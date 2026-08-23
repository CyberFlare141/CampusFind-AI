import { apiClient } from './apiClient';
export interface CreateFoundItemRequest { title: string; description?: string; foundAt?: string; categoryId?: string | null; locationId?: string | null; images?: File[]; }
export interface FoundItem { id: string; userId: string; title: string; description?: string | null; foundAt?: string | null; categoryId?: string | null; locationId?: string | null; imageUrls: string[]; }
export async function createFoundItem(request: CreateFoundItemRequest): Promise<FoundItem> { const data = new FormData(); data.append('title', request.title); if (request.description) data.append('description', request.description); if (request.foundAt) data.append('foundAt', request.foundAt); if (request.categoryId) data.append('categoryId', request.categoryId); if (request.locationId) data.append('locationId', request.locationId); request.images?.forEach(image => data.append('images', image)); return (await apiClient.post<FoundItem>('/FoundItems', data)).data; }
export async function getMyFoundItems(): Promise<FoundItem[]> { return (await apiClient.get<FoundItem[]>('/FoundItems/my')).data; }
export async function getFoundItemById(id: string): Promise<FoundItem> { return (await apiClient.get<FoundItem>(`/FoundItems/${id}`)).data; }
export async function getAllFoundItems(): Promise<FoundItem[]> { return (await apiClient.get<FoundItem[]>('/FoundItems')).data; }
