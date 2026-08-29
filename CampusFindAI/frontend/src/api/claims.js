import { apiRequest } from './client';

// Matches ClaimsController.cs exactly.
// CreateClaimDto: { foundItemId, claimantNotes? }
// ClaimDecisionDto: { approve: boolean, decisionNotes? }
// ClaimDto includes found item + claimant + reviewer summary fields.

export function createClaim({ foundItemId, claimantNotes }) {
  return apiRequest('/claims', {
    method: 'POST',
    body: { foundItemId, claimantNotes: claimantNotes || null },
  });
}

export function getMyClaims() {
  return apiRequest('/claims/my');
}

/** Security officer / administrator only. */
export function getPendingClaims() {
  return apiRequest('/claims/pending');
}

/** Security officer / administrator only. */
export function getAllClaims() {
  return apiRequest('/claims');
}

export function getClaimById(id) {
  return apiRequest(`/claims/${id}`);
}

/** Full evidence view for Security Officers and Administrators only. */
export function getClaimReview(id) {
  return apiRequest(`/claims/${id}/review`);
}

/** Security officer / administrator only. */
export function decideClaim(id, { approve, decisionNotes }) {
  return apiRequest(`/claims/${id}/decision`, {
    method: 'POST',
    body: { approve, decisionNotes: decisionNotes || null },
  });
}
