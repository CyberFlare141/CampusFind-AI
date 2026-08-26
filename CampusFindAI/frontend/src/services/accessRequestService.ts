import { apiClient } from './apiClient';

export type AccessRequestStatus = 'Pending' | 'Approved' | 'Rejected';
export interface AccessRequest { id: string; userId: string; email: string; fullName?: string; staffId?: string; department?: string; reason: string; status: AccessRequestStatus; reviewedByUserId?: string; reviewedAt?: string; rejectionReason?: string; createdAt: string; }
export interface CreateAccessRequest { fullName?: string; staffId?: string; department?: string; reason: string; }

export async function createAccessRequest(request: CreateAccessRequest): Promise<AccessRequest> { return (await apiClient.post<AccessRequest>('/security-officer-requests', request)).data; }
export async function getMyAccessRequests(): Promise<AccessRequest[]> { return (await apiClient.get<AccessRequest[]>('/security-officer-requests/my')).data; }
export async function getAccessRequests(): Promise<AccessRequest[]> { return (await apiClient.get<AccessRequest[]>('/security-officer-requests')).data; }
export async function approveAccessRequest(id: string): Promise<AccessRequest> { return (await apiClient.post<AccessRequest>(`/security-officer-requests/${id}/approve`)).data; }
export async function rejectAccessRequest(id: string, reason?: string): Promise<AccessRequest> { return (await apiClient.post<AccessRequest>(`/security-officer-requests/${id}/reject`, { reason })).data; }