import { apiClient } from './apiClient';
import type { SuggestedMatch } from '../types/security';

export async function getSuggestedMatches(): Promise<SuggestedMatch[]> {
  const response = await apiClient.get<SuggestedMatch[]>('/Matches/suggested');
  return response.data;
}
