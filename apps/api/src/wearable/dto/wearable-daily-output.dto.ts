import { ApiProperty } from '@nestjs/swagger';
import { WearableMetrics } from './wearable-daily-input.dto';

/**
 * Output for GET /v1/wearable/daily (decrypted)
 */
export class WearableDailyDto {
  @ApiProperty({ description: 'Unique identifier', example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ description: 'Subject identifier', example: '550e8400-e29b-41d4-a716-446655440001' })
  subject_id: string;

  @ApiProperty({ description: 'Date in YYYY-MM-DD', example: '2026-11-14' })
  date: string;

  @ApiProperty({ description: 'Source identifier', enum: ['oura', 'generic', 'simulator'], example: 'simulator' })
  source: string;

  @ApiProperty({ description: 'Decrypted canonical metrics', type: WearableMetrics })
  metrics: WearableMetrics;

  @ApiProperty({ description: 'When this data was received', example: '2026-11-14T12:00:00Z' })
  received_at: string;
}

/**
 * Response for POST /v1/wearable/daily
 */
export class WearableDailyResponseDto {
  @ApiProperty({ description: 'Unique identifier of stored record', example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ description: 'Status message', example: 'Metrics received' })
  message: string;

  @ApiProperty({ description: 'Date that was stored', example: '2026-11-14' })
  date: string;
}

/**
 * Response for POST /v1/wearable/daily/batch
 */
export class WearableDailyBatchResponseDto {
  @ApiProperty({ description: 'Number of days successfully stored', example: 60 })
  stored: number;

  @ApiProperty({ description: 'Status message', example: '60 days received' })
  message: string;
}

/**
 * Response for POST /v1/wearable/demo-seed
 */
export class DemoSeedResponseDto {
  @ApiProperty({ description: 'Number of days generated', example: 60 })
  days_generated: number;

  @ApiProperty({ description: 'Scenario used', example: 'steady' })
  scenario: string;

  @ApiProperty({ description: 'Status message', example: 'Demo data generated (60 days)' })
  message: string;
}
