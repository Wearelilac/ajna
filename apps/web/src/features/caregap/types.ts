/**
 * W4.2: Care-Gap Review Types
 */

export interface OutreachDraft {
  id: string;
  careGapId: string;
  pathwayId: string;
  body: string;
  language: string;
  readingLevel: string | null;
  status: DraftStatus;
  generatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export type DraftStatus =
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'edited_approved'
  | 'rejected'
  | 'closed';

export interface CareGap {
  id: string;
  subjectId: string;
  gapType: string;
  dueDate: string | null;
  indicatorSummary: Record<string, any>;
  status: string;
  createdAt: string;
}

export interface PathwayMatch {
  id: string;
  pathwayId: string;
  rank: number;
  similarity: number;
  filteredBy: Record<string, any>;
  pathwayTitle: string;
  pathwayDescription: string;
}
