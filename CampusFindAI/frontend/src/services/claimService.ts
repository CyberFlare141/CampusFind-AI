import { apiClient } from './apiClient';
import type { Claim, ClaimDecisionRequest, CreateClaimRequest } from '../types/security';

export async function createClaim(request: CreateClaimRequest): Promise<Claim> {
  const response = await apiClient.post<Claim>('/Claims', request);
  return response.data;
}

export async function getMyClaims(): Promise<Claim[]> {
  const response = await apiClient.get<Claim[]>('/Claims/my');
  return response.data;
}

export async function getPendingClaims(): Promise<Claim[]> {
  const response = await apiClient.get<Claim[]>('/Claims/pending');
  return response.data;
}

export async function getAllClaims(): Promise<Claim[]> {
  const response = await apiClient.get<Claim[]>('/Claims');
  return response.data;
}

export async function getClaimById(id: string): Promise<Claim> {
  const response = await apiClient.get<Claim>(`/Claims/${id}`);
  return response.data;
}

export async function decideClaim(
  id: string,
  request: ClaimDecisionRequest
): Promise<Claim> {
  const response = await apiClient.post<Claim>(`/Claims/${id}/decision`, request);
  return response.data;
}
