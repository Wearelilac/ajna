/**
 * B4.2: Care-Gap DTOs
 */

export interface CareGapDto {
  id: string;
  subjectId: string;
  gapType: string;
  dueDate: string | null;
  indicatorSummary: Record<string, any>;
  status: string;
  createdAt: string;
}

export interface PathwayMatchDto {
  id: string;
  pathwayId: string;
  rank: number;
  similarity: number;
  filteredBy: Record<string, any>;
  pathwayTitle: string;
  pathwayDescription: string;
}

export interface OutreachDraftDto {
  id: string;
  careGapId: string;
  pathwayId: string;
  body: string;
  language: string;
  readingLevel: string | null;
  status: string;
  generatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CarePathwayDto {
  id: string;
  title: string;
  eligibility: Record<string, any>;
  description: string;
  wordingSnippets: Record<string, any>;
  ownerRole: string;
  approvedBy: string;
  approvedOn: string;
  active: boolean;
}

export interface DraftTransitionDto {
  toStatus: string;
  reason?: string;
  editedBody?: string;
}

export interface UpdateDraftBodyDto {
  body: string;
}
