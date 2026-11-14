import { ApiProperty } from '@nestjs/swagger';

/**
 * PRI point (date + score)
 */
export class PriPointDto {
  @ApiProperty({ description: 'Date (YYYY-MM-DD)', example: '2026-11-14' })
  date: string;

  @ApiProperty({ description: 'PRI score (0-100, higher is better)', minimum: 0, maximum: 100, example: 72 })
  pri: number;

  @ApiProperty({ description: 'Number of deviation flags on this day', example: 1 })
  deviation_count: number;
}

/**
 * Deviation flag
 */
export class DeviationFlagDto {
  @ApiProperty({ description: 'Flag ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ description: 'Date (YYYY-MM-DD)', example: '2026-11-14' })
  date: string;

  @ApiProperty({ description: 'Metric name', example: 'hrv_rmssd_ms' })
  metric: string;

  @ApiProperty({ description: 'Z-score', example: -3.24 })
  z: number;

  @ApiProperty({ description: 'Direction', enum: ['high', 'low'], example: 'low' })
  direction: 'high' | 'low';

  @ApiProperty({ description: 'Status (always flagged_for_review)', example: 'flagged_for_review' })
  status: string;

  @ApiProperty({ description: 'When flagged', example: '2026-11-14T12:00:00Z' })
  flagged_at: string;
}

/**
 * Radar summary (latest PRI, trend, active flags)
 */
export class RadarSummaryDto {
  @ApiProperty({ description: 'Latest PRI score (0-100)', minimum: 0, maximum: 100, example: 72 })
  latest_pri: number;

  @ApiProperty({ description: 'Latest PRI date', example: '2026-11-14' })
  latest_date: string;

  @ApiProperty({ description: '7-day PRI trend (positive = improving)', example: 5 })
  trend_7d: number;

  @ApiProperty({ description: '30-day PRI trend', example: -2 })
  trend_30d: number;

  @ApiProperty({ description: 'Active deviation flags (last 7 days)', type: [DeviationFlagDto] })
  active_flags: DeviationFlagDto[];

  @ApiProperty({ description: 'Data staleness indicator (true if scoring unavailable)', example: false })
  is_stale: boolean;
}
