export interface Claim {
  id: string;
  foundItemId: string;
  foundItemTitle: string;
  foundItemDescription?: string | null;
  claimantUserId: string;
  claimantEmail: string;
  claimantNotes?: string | null;
  status: 'Pending' | 'Approved' | 'Rejected' | string;
  createdAt: string;
  reviewedByUserId?: string | null;
  reviewedByEmail?: string | null;
  reviewedAt?: string | null;
  decisionNotes?: string | null;
}

export interface ClaimDecisionRequest {
  approve: boolean;
  decisionNotes?: string;
}

export interface CreateClaimRequest {
  foundItemId: string;
  claimantNotes?: string;
}

export interface SuggestedMatch {
  id: string;
  lostItemId: string;
  lostItemTitle: string;
  lostItemUserId: string;
  foundItemId: string;
  foundItemTitle: string;
  foundItemUserId: string;
  confidenceScore: number;
}

export interface SecurityOverview {
  pendingClaimsCount: number;
  suggestedMatchesCount: number;
}

export interface LoginConfirmation {
  userId: string;
  email: string;
  role: string;
  lastLoginAt?: string | null;
  confirmedAt: string;
}

export interface LoginHistoryEntry {
  id: string;
  action: string;
  details?: string | null;
  createdAt: string;
}
