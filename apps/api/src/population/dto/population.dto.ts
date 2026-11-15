/**
 * B4.1: Population DTOs
 * All aggregates enforce K-anonymity (K≥10)
 * Suppressed cells return NULL counts
 */

import { IsInt, IsNumber, IsString, IsBoolean, IsOptional, IsArray } from 'class-validator';

export class PopulationOverviewDto {
  @IsInt()
  totalCommunities: number;

  @IsInt()
  totalSubjects: number;

  @IsInt()
  totalFlags: number;

  @IsNumber()
  avgPri: number;

  @IsString()
  latestWeek: string;
}

export class CommunitySummaryDto {
  @IsString()
  communityId: string;

  @IsString()
  name: string;

  @IsString()
  regionCode: string;

  @IsNumber()
  deprivationIndex: number;

  @IsInt()
  populationEstimate: number;

  @IsOptional()
  @IsString()
  latestMonth?: string;

  @IsOptional()
  @IsInt()
  subjectsN?: number | null;

  @IsOptional()
  @IsInt()
  flagCount?: number | null;

  @IsOptional()
  @IsNumber()
  meanPri?: number | null;

  @IsOptional()
  @IsNumber()
  deviationShare?: number | null;

  @IsBoolean()
  suppressed: boolean;
}

export class MonthlyTrendPointDto {
  @IsString()
  month: string;

  @IsOptional()
  @IsInt()
  subjectsN?: number | null;

  @IsOptional()
  @IsInt()
  flagCount?: number | null;

  @IsOptional()
  @IsNumber()
  meanPri?: number | null;

  @IsOptional()
  @IsNumber()
  deviationShare?: number | null;

  @IsBoolean()
  suppressed: boolean;
}

export class CommunityTrendDto {
  @IsString()
  communityId: string;

  @IsString()
  name: string;

  @IsString()
  regionCode: string;

  @IsNumber()
  deprivationIndex: number;

  @IsInt()
  populationEstimate: number;

  @IsArray()
  monthlyTrend: MonthlyTrendPointDto[];
}

export class SimilarCommunityDto {
  @IsString()
  communityId: string;

  @IsString()
  name: string;

  @IsString()
  regionCode: string;

  @IsNumber()
  deprivationIndex: number;

  @IsNumber()
  similarity: number; // 0-1 (cosine similarity)

  features: any; // Feature breakdown for transparency
}

export class ClusterSummaryDto {
  @IsInt()
  clusterId: number;

  @IsString()
  label: string; // Descriptive, NOT diagnostic

  @IsNumber()
  avgScore: number;

  @IsInt()
  memberCount: number;
}
