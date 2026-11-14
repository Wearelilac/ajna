import { IsString, IsDateString, IsNumber, IsOptional, IsIn, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Canonical wearable metrics (decrypted payload shape)
 * From P0.1 canonical.schema.json
 */
export class WearableMetrics {
  @ApiProperty({ description: 'Heart rate variability (RMSSD) in milliseconds', minimum: 1, maximum: 300, example: 45.5 })
  @IsNumber()
  @Min(1)
  @Max(300)
  hrv_rmssd_ms: number;

  @ApiProperty({ description: 'Skin temperature deviation from personal baseline in °C', minimum: -10, maximum: 10, example: 0.3, required: false, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(-10)
  @Max(10)
  skin_temp_dev_c?: number | null;

  @ApiProperty({ description: 'Resting heart rate in beats per minute', minimum: 30, maximum: 120, example: 62 })
  @IsNumber()
  @Min(30)
  @Max(120)
  resting_hr_bpm: number;

  @ApiProperty({ description: 'Total sleep time in minutes', minimum: 0, maximum: 1440, example: 480 })
  @IsNumber()
  @Min(0)
  @Max(1440)
  sleep_total_min: number;

  @ApiProperty({ description: 'Deep sleep in minutes', minimum: 0, maximum: 1440, example: 120, required: false, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1440)
  sleep_deep_min?: number | null;

  @ApiProperty({ description: 'REM sleep in minutes', minimum: 0, maximum: 1440, example: 140, required: false, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1440)
  sleep_rem_min?: number | null;

  @ApiProperty({ description: 'Light sleep in minutes', minimum: 0, maximum: 1440, example: 180, required: false, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1440)
  sleep_light_min?: number | null;

  @ApiProperty({ description: 'Awake time during sleep period in minutes', minimum: 0, maximum: 1440, example: 40, required: false, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1440)
  sleep_awake_min?: number | null;

  @ApiProperty({ description: 'Sleep efficiency as fraction', minimum: 0, maximum: 1, example: 0.92, required: false, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  sleep_efficiency?: number | null;

  @ApiProperty({ description: 'Activity/recovery ratio', minimum: 0, maximum: 2, example: 1.1, required: false, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  activity_recovery_ratio?: number | null;
}

/**
 * Input for POST /v1/wearable/daily
 */
export class WearableDailyInputDto {
  @ApiProperty({ description: 'Vendor or source identifier', enum: ['oura', 'generic', 'simulator'], example: 'simulator' })
  @IsString()
  @IsIn(['oura', 'generic', 'simulator'])
  source: string;

  @ApiProperty({ description: 'Date in YYYY-MM-DD (UTC)', example: '2026-11-14' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Canonical wearable metrics', type: WearableMetrics })
  @ValidateNested()
  @Type(() => WearableMetrics)
  metrics: WearableMetrics;
}

/**
 * Input for POST /v1/wearable/daily/batch
 */
export class WearableDailyBatchInputDto {
  @ApiProperty({ description: 'Array of daily metrics (max 60)', type: [WearableDailyInputDto], maxItems: 60 })
  @ValidateNested({ each: true })
  @Type(() => WearableDailyInputDto)
  days: WearableDailyInputDto[];
}

/**
 * Demo seed scenario
 */
export class DemoSeedInputDto {
  @ApiProperty({ description: 'Simulation scenario', enum: ['steady', 'gradual_decline', 'acute_deviation'], example: 'steady', required: false })
  @IsOptional()
  @IsString()
  @IsIn(['steady', 'gradual_decline', 'acute_deviation'])
  scenario?: string;
}
