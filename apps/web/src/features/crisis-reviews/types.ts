/**
 * W3.1: Crisis Review types
 * Mirrors B3.1 schemas
 */

export type CrisisReviewState = 'new' | 'assigned' | 'in_review' | 'closed';

export type CrisisOutcome =
  | 'no_action'
  | 'routine_follow_up_requested'
  | 'escalated_to_clinical_lead';

export interface CrisisReview {
  id: string;
  subjectId?: string; // Hidden unless revealed
  state: CrisisReviewState;
  ownerId?: string;
  outcome?: CrisisOutcome;
  firstFlagAt: string;
  lastFlagAt: string;
  flagCount: number;
  createdAt: string;
  assignedAt?: string;
  closedAt?: string;
  escalatedToLead: boolean;
  flags?: DeIdentifiedFlagSummary[];
}

export interface DeIdentifiedFlagSummary {
  id: string;
  signature: string;
  confidence: number;
  timeBucket: string;
  modelVersion: string;
  createdAt: string;
}

export interface CrisisReviewEvent {
  id: string;
  reviewId: string;
  fromState: string;
  toState: string;
  actorId: string;
  reason?: string;
  at: string;
}

export interface RevealedContact {
  subjectId: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  revealedAt: string;
  reason: string;
}
