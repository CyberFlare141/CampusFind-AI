import { apiRequest } from './client';

// Matches MatchesController.cs and SecurityController.cs exactly.
// All endpoints here require the SecurityOfficer or Administrator role.

export function getSuggestedMatches() {
  return apiRequest('/matches/suggested');
}

export function getSecurityOverview() {
  return apiRequest('/security/overview');
}

export function getLoginConfirmation() {
  return apiRequest('/security/login-confirmation');
}

export function getLoginHistory() {
  return apiRequest('/security/login-history');
}

export function getLoginDetail(id) {
  return apiRequest(`/security/login-history/${id}`);
}
