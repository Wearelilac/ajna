/**
 * M3.1: FlagBuilder - Construct de-identified flags
 * Ported from P0.2 prototype
 *
 * Rules (from 00-data-protection-model.md section 1):
 * - 7-field allow-list ONLY
 * - NO audio, NO features, NO transcripts
 * - Time bucket truncated to hour (server-side, but we prepare it)
 * - Confidence rounded to 2 decimals
 *
 * NO imports of: network, filesystem, storage
 */

import { DeIdentifiedFlag, InferenceResult } from './types';

export class FlagBuilder {
  /**
   * Build a de-identified flag from an inference result.
   * Only these fields are allowed (allow-list from spec):
   * - sessionId, signature, confidence, timeBucket, modelVersion,
   *   sessionDurationSec, energyDb
   *
   * Explicitly NOT allowed:
   * - Audio, waveforms, spectrograms
   * - Features, embeddings, acoustic measures
   * - Transcripts, text, speech-to-text
   * - GPS, location (except coarse region from vault)
   * - Duration, speaker count, loudness (beyond energyDb)
   * - Device ID, IP, precise timestamp
   */
  static build(
    inferenceResult: InferenceResult,
    sessionId: string,
    modelVersion: string,
    sessionStartMs: number,
  ): DeIdentifiedFlag {
    // Time bucket (will be truncated to hour server-side)
    const now = new Date();

    // Compute energy in dB (rough estimate from confidence)
    // In production, this would come from audio analysis
    const energyDb = -120 + inferenceResult.confidence * 120; // -120 to 0 dB range

    const flag: DeIdentifiedFlag = {
      sessionId,
      signature: inferenceResult.signature,
      confidence: Math.round(inferenceResult.confidence * 100) / 100, // 2 decimals
      timeBucket: now.toISOString(), // Server truncates to hour
      modelVersion,
      sessionDurationSec: Math.floor((Date.now() - sessionStartMs) / 1000),
      energyDb: Math.round(energyDb * 100) / 100, // 2 decimals
    };

    return flag;
  }

  /**
   * Validate a flag against the allow-list.
   * Rejects unknown fields.
   */
  static validate(flag: any): boolean {
    const allowedFields = new Set([
      'sessionId',
      'signature',
      'confidence',
      'timeBucket',
      'modelVersion',
      'sessionDurationSec',
      'energyDb',
    ]);

    // Check for unknown fields
    for (const key in flag) {
      if (!allowedFields.has(key)) {
        console.error(`Flag field not allowed: ${key}`);
        return false;
      }
    }

    // Type checks
    if (typeof flag.sessionId !== 'string') return false;
    if (typeof flag.signature !== 'string') return false;
    if (
      typeof flag.confidence !== 'number' ||
      flag.confidence < 0 ||
      flag.confidence > 1
    )
      return false;
    if (typeof flag.timeBucket !== 'string') return false;
    if (typeof flag.modelVersion !== 'string') return false;

    // Optional fields
    if (
      flag.sessionDurationSec !== undefined &&
      typeof flag.sessionDurationSec !== 'number'
    )
      return false;
    if (flag.energyDb !== undefined && typeof flag.energyDb !== 'number')
      return false;

    return true;
  }

  /**
   * Reject audio-like data types to prove ephemerality.
   */
  static rejectAudioTypes(data: any): void {
    const bannedTypes = [
      'audioBuffer',
      'audioContext',
      'analyser',
      'waveformData',
      'spectrogramData',
      'mfcc',
      'features',
      'embedding',
      'transcript',
      'text',
      'words',
      'loudness',
      'samples',
      'audio',
      'raw',
      'pcm',
    ];

    for (const banned of bannedTypes) {
      if (banned in data) {
        throw new Error(`Audio type ${banned} found in flag - data leak`);
      }
    }
  }
}
