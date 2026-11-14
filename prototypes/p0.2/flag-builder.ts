/**
 * Flag Builder: Construct de-identified flags from inference results.
 *
 * Rules (from 00-data-protection-model.md section 1):
 * - Field-by-field allow-list only
 * - No audio, no features, no transcripts
 * - Pseudonymous subject_id only
 * - Time bucket truncated to the hour
 * - Confidence rounded to 2 decimals
 */

import { DistressSignature, InferenceResult } from "./inference-engine";

export interface DeIdentifiedFlag {
  id: string;
  subject_id: string;
  signature: DistressSignature;
  confidence: number; // 0-1, 2 decimals
  time_bucket: string; // ISO string truncated to hour
  model_version: string;
  session_id: string;
}

/**
 * Build de-identified flags from inference results.
 */
export class FlagBuilder {
  /**
   * Build a flag from an inference result.
   * Only these fields are allowed (allow-list from spec):
   * - id, subject_id, signature, confidence, time_bucket, model_version, session_id
   *
   * Explicitly NOT allowed:
   * - Audio, waveforms, spectrograms
   * - Features, embeddings, acoustic measures
   * - Transcripts, text, speech-to-text
   * - GPS, location (except coarse region from vault)
   * - Duration, speaker count, loudness
   * - Device ID, IP, precise timestamp
   */
  public static build(
    inferenceResult: InferenceResult,
    subjectId: string,
    sessionId: string,
    modelVersion: string
  ): DeIdentifiedFlag {
    // Generate random IDs (never linked to audio or subject identity)
    const flagId = this._generateUUID();
    
    // Truncate time to hour (for privacy: prevents minute-level location correlation)
    const now = new Date();
    const hourTruncated = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      0,
      0,
      0
    );

    const flag: DeIdentifiedFlag = {
      id: flagId,
      subject_id: subjectId,
      signature: inferenceResult.signature,
      confidence: Math.round(inferenceResult.confidence * 100) / 100, // 2 decimals
      time_bucket: hourTruncated.toISOString(),
      model_version: modelVersion,
      session_id: sessionId,
    };

    return flag;
  }

  /**
   * Validate a flag against the allow-list.
   * Rejects unknown fields.
   */
  public static validate(flag: any): boolean {
    const allowedFields = new Set([
      "id",
      "subject_id",
      "signature",
      "confidence",
      "time_bucket",
      "model_version",
      "session_id",
    ]);

    // Check for unknown fields
    for (const key in flag) {
      if (!allowedFields.has(key)) {
        console.error(`Flag field not allowed: ${key}`);
        return false;
      }
    }

    // Type checks
    if (typeof flag.id !== "string") return false;
    if (typeof flag.subject_id !== "string") return false;
    if (typeof flag.signature !== "string") return false;
    if (typeof flag.confidence !== "number" || flag.confidence < 0 || flag.confidence > 1) return false;
    if (typeof flag.time_bucket !== "string") return false;
    if (typeof flag.model_version !== "string") return false;
    if (typeof flag.session_id !== "string") return false;

    return true;
  }

  /**
   * Generate a random UUID v4.
   */
  private static _generateUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Reject audio-like data types to prove ephemerality.
   */
  public static _rejectAudioTypes(data: any): void {
    // These should never appear in a flag
    const bannedTypes = [
      "audioBuffer", // From Web Audio API
      "audioContext",
      "analyser",
      "waveformData",
      "spectrogramData",
      "mfcc", // Audio features
      "features",
      "embedding",
      "transcript",
      "text",
      "words",
      "loudness",
      "energy",
      "rms",
      "zcr",
      "samples",
    ];

    for (const banned of bannedTypes) {
      if (banned in data) {
        throw new Error(`Audio type ${banned} found in flag - data leak`);
      }
    }
  }
}
