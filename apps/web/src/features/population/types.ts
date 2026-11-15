/**
 * W4.1: Population Dashboard Types
 */

export interface PopulationOverview {
  totalCommunities: number;
  totalSubjects: number;
  totalFlags: number;
  avgPri: number;
  latestWeek: string;
}

export interface Community {
  communityId: string;
  name: string;
  regionCode: string;
  deprivationIndex: number;
  populationEstimate: number;
  latestMonth: string | null;
  subjectsN: number | null;
  flagCount: number | null;
  meanPri: number | null;
  deviationShare: number | null;
  suppressed: boolean;
}

export interface Cluster {
  clusterId: number;
  label: string;
  score: number;
  scoreBreakdown: {
    deprivation: number;
    pri: number;
    deviation_share: number;
    flag_rate: number;
  };
  communities: string[];
}
