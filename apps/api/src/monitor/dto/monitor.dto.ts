/**
 * B3.1: Monitor session and de-identified flag DTOs
 * 00-data-protection-model.md section 1 (7-field allow-list)
 */

import {
  IsUUID,
  IsString,
  IsNumber,
  Min,
  Max,
  IsIn,
  IsOptional,
  IsDateString,
  IsInt,
  MaxLength,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Response DTO for monitor session start
 */
export class MonitorSessionDto {
  @IsUUID()
  id: string;

  @IsUUID()
  subjectId: string;

  @IsDateString()
  startedAt: string;

  @IsOptional()
  @IsDateString()
  endedAt?: string;

  @IsInt()
  @Min(1)
  maxDurationSec: number;

  @IsOptional()
  @IsString()
  @IsIn(['user_stopped', 'timeout', 'consent_revoked'])
  endReason?: string;
}

/**
 * Request DTO to end a monitor session
 */
export class EndMonitorSessionDto {
  @IsString()
  @IsIn(['user_stopped', 'timeout'])
  endReason: string;
}

/**
 * Input DTO for de-identified flag (7-field allow-list ONLY)
 * NO audio, NO transcript, NO features, NO precise location, NO device ID
 */
export class DeIdentifiedFlagInputDto {
  @IsUUID()
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @IsIn([
    'distress_signature',
    'vocal_tension_spike',
    'speech_rate_anomaly',
    'pitch_variance_high',
    'energy_drop_sustained',
  ])
  signature: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @IsDateString()
  timeBucket: string; // Will be truncated to hour server-side

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @IsIn(['distress-1.0', 'acoustic-engine-v1'])
  modelVersion: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(600) // Session cap from P0.2
  sessionDurationSec?: number;

  @IsOptional()
  @IsNumber()
  @Min(-120)
  @Max(0)
  energyDb?: number;
}

/**
 * Response DTO for de-identified flag
 */
export class DeIdentifiedFlagDto {
  @IsUUID()
  id: string;

  @IsUUID()
  sessionId: string;

  @IsString()
  signature: string;

  @IsNumber()
  confidence: number;

  @IsDateString()
  timeBucket: string; // Truncated to hour

  @IsString()
  modelVersion: string;

  @IsOptional()
  @IsInt()
  sessionDurationSec?: number;

  @IsOptional()
  @IsNumber()
  energyDb?: number;

  @IsDateString()
  createdAt: string;
}
