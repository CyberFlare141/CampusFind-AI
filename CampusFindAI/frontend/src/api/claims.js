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

/** Security officer / administrator only. Records the final in-person return. */
export function completeHandover(id, { handoverNotes }) {
  return apiRequest(`/claims/${id}/handover`, {
    method: 'POST',
    body: { handoverNotes: handoverNotes || null },
  });
}

/** Student / claimant: retrieves or generates AI ownership verification questions. */
export function getOrGenerateVerification(claimId) {
  return apiRequest(`/claims/${claimId}/verification`, {
    method: 'POST',
  });
}

/** Student / claimant: submits answers to verification questions. */
export function submitVerificationAnswers(claimId, answers) {
  return apiRequest(`/claims/${claimId}/verification/submit`, {
    method: 'POST',
    body: { answers },
  });
}

/** Security officer / administrator only: view detailed AI evaluation, match score, and question breakdown. */
export function getOfficerVerificationReview(claimId) {
  return apiRequest(`/claims/${claimId}/verification/officer-review`);
}

