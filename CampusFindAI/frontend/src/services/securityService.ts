import { apiClient } from './apiClient';
import type {
  LoginConfirmation,
  LoginHistoryEntry,
  SecurityOverview,
} from '../types/security';

export async function getSecurityOverview(): Promise<SecurityOverview> {
  const response = await apiClient.get<SecurityOverview>('/Security/overview');
  return response.data;
}

export async function getLoginConfirmation(): Promise<LoginConfirmation> {
  const response = await apiClient.get<LoginConfirmation>(
    '/Security/login-confirmation'
  );
  return response.data;
}

export async function getLoginHistory(): Promise<LoginHistoryEntry[]> {
  const response = await apiClient.get<LoginHistoryEntry[]>(
    '/Security/login-history'
  );
  return response.data;
}

export async function getLoginHistoryDetail(
  id: string
): Promise<LoginHistoryEntry> {
  const response = await apiClient.get<LoginHistoryEntry>(
    `/Security/login-history/${id}`
  );
  return response.data;
}
