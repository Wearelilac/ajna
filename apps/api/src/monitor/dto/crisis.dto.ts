/**
 * B3.1: Crisis review DTOs
 * Workflow queue for human Reviewers
 */

import {
  IsUUID,
  IsString,
  IsIn,
  IsInt,
  IsBoolean,
  IsOptional,
  IsDateString,
  Min,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';

export type CrisisReviewState = 'new' | 'assigned' | 'in_review' | 'closed';
export type CrisisOutcome =
  | 'no_action'
  | 'routine_follow_up_requested'
  | 'escalated_to_clinical_lead';

/**
 * Response DTO for crisis review item
 */
export class CrisisReviewDto {
  @IsUUID()
  id: string;

  // subject_id is HIDDEN unless reveal-contact is used
  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @IsString()
  @IsIn(['new', 'assigned', 'in_review', 'closed'])
  state: CrisisReviewState;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['no_action', 'routine_follow_up_requested', 'escalated_to_clinical_lead'])
  outcome?: CrisisOutcome;

  @IsDateString()
  firstFlagAt: string;

  @IsDateString()
  lastFlagAt: string;

  @IsInt()
  @Min(1)
  flagCount: number;

  @IsDateString()
  createdAt: string;

  @IsOptional()
  @IsDateString()
  assignedAt?: string;

  @IsOptional()
  @IsDateString()
  closedAt?: string;

  @IsBoolean()
  escalatedToLead: boolean;

  // Aggregated flags (de-identified)
  flags?: DeIdentifiedFlagSummaryDto[];
}

/**
 * Summary of de-identified flags for a crisis review
 */
export class DeIdentifiedFlagSummaryDto {
  @IsUUID()
  id: string;

  @IsString()
  signature: string;

  @IsNumber()
  confidence: number;

  @IsDateString()
  timeBucket: string;

  @IsString()
  modelVersion: string;

  @IsDateString()
  createdAt: string;
}

/**
 * Query filters for crisis review list
 */
export class CrisisReviewQueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['new', 'assigned', 'in_review', 'closed'])
  state?: CrisisReviewState;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['true', 'false'])
  escalatedToLead?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}

/**
 * Request DTO to assign a crisis review
 */
export class AssignCrisisReviewDto {
  @IsUUID()
  ownerId: string;
}

/**
 * Request DTO to transition a crisis review
 */
export class TransitionCrisisReviewDto {
  @IsString()
  @IsIn(['assigned', 'in_review', 'closed'])
  toState: CrisisReviewState;

  @IsOptional()
  @IsString()
  @IsIn(['no_action', 'routine_follow_up_requested', 'escalated_to_clinical_lead'])
  outcome?: CrisisOutcome;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/**
 * Request DTO to reveal contact info (with audit reason)
 */
export class RevealContactDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

/**
 * Response DTO for revealed contact
 */
export class RevealedContactDto {
  @IsUUID()
  subjectId: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @IsOptional()
  @IsString()
  emergencyPhone?: string;

  @IsDateString()
  revealedAt: string;

  @IsString()
  reason: string;
}

/**
 * Crisis review event (audit trail)
 */
export class CrisisReviewEventDto {
  @IsUUID()
  id: string;

  @IsUUID()
  reviewId: string;

  @IsString()
  fromState: string;

  @IsString()
  toState: string;

  @IsUUID()
  actorId: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsDateString()
  at: string;

  @IsOptional()
  @IsString()
  prevHash?: string;

  @IsString()
  rowHash: string;
}
