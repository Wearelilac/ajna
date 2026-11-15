/**
 * M3.1: Edge module types
 * Local types ONLY (no network imports)
 * Mirrors DeIdentifiedFlagInput from contract (imported in M3.2, not here)
 */

export enum DistressSignature {
  VOCAL_TENSION_SPIKE = 'vocal_tension_spike',
  DISTRESS_SIGNATURE = 'distress_signature',
  VERBAL_AGGRESSION_PATTERN = 'verbal_aggression_pattern',
  SPEECH_RATE_ANOMALY = 'speech_rate_anomaly',
  PITCH_VARIANCE_HIGH = 'pitch_variance_high',
  ENERGY_DROP_SUSTAINED = 'energy_drop_sustained',
}

/**
 * De-identified flag (7-field allow-list ONLY)
 * NO audio, NO features, NO transcript, NO precise location, NO device ID
 */
export interface DeIdentifiedFlag {
  sessionId: string;
  signature: string;
  confidence: number; // 0-1, rounded to 2 decimals
  timeBucket: string; // ISO string, truncated to hour server-side
  modelVersion: string;
  sessionDurationSec?: number;
  energyDb?: number;
}

export interface InferenceResult {
  signature: DistressSignature;
  confidence: number; // 0-1
  windowStartMs: number;
  processingTimeMs: number;
}

export interface AudioWindow {
  samples: Float32Array;
  startIndex: number;
  endIndex: number;
}

export interface EdgeBufferConfig {
  capacitySamples: number; // 16 kHz × 10 sec = 160,000 samples
  sampleRate: number; // 16,000 Hz
}

export interface EdgeControllerConfig {
  sessionId: string;
  maxDurationSec: number;
  modelVersion: string;
  thresholds: Map<DistressSignature, number>;
  onFlag: (flag: DeIdentifiedFlag) => void;
  onIndicator: (isListening: boolean) => void;
}

export interface EdgeStatus {
  isListening: boolean;
  windowsProcessed: number;
  flagsEmitted: number;
  elapsedMs: number;
  remainingMs: number;
}
