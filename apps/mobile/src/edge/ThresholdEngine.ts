/**
 * M3.1: ThresholdEngine - Per-signature thresholds and smoothing
 *
 * Rules:
 * - Per-signature thresholds (configured)
 * - Smoothing: N of M windows (e.g., 3 of 5 windows above threshold)
 * - Cool-down between flags (prevent spam)
 * - Cap on flags per session (from P0.2 limits: 100 max)
 *
 * NO imports of: network, filesystem, storage
 */

import { DistressSignature, InferenceResult } from './types';

export interface ThresholdConfig {
  thresholds: Map<DistressSignature, number>;
  smoothingWindow: number; // M windows
  smoothingRequired: number; // N of M
  cooldownMs: number; // Min time between flags
  maxFlagsPerSession: number;
}

interface ThresholdState {
  recentScores: Map<DistressSignature, number[]>;
  lastFlagAtMs: Map<DistressSignature, number>;
  flagsEmitted: number;
}

export class ThresholdEngine {
  private config: ThresholdConfig;
  private state: ThresholdState;

  constructor(config: ThresholdConfig) {
    this.config = config;
    this.state = {
      recentScores: new Map(),
      lastFlagAtMs: new Map(),
      flagsEmitted: 0,
    };

    // Initialize recent scores for each signature
    for (const signature of Object.values(DistressSignature)) {
      this.state.recentScores.set(signature, []);
      this.state.lastFlagAtMs.set(signature, 0);
    }
  }

  /**
   * Evaluate if an inference result should emit a flag.
   * Returns the result if threshold crossed, null otherwise.
   */
  shouldEmitFlag(
    result: InferenceResult | null,
    currentTimeMs: number,
  ): InferenceResult | null {
    if (!result) {
      return null;
    }

    const { signature, confidence } = result;

    // Check session flag cap
    if (this.state.flagsEmitted >= this.config.maxFlagsPerSession) {
      return null;
    }

    // Check cooldown
    const lastFlagAt = this.state.lastFlagAtMs.get(signature) || 0;
    if (currentTimeMs - lastFlagAt < this.config.cooldownMs) {
      return null;
    }

    // Add to recent scores
    const recentScores = this.state.recentScores.get(signature)!;
    recentScores.push(confidence);

    // Keep only last M windows
    if (recentScores.length > this.config.smoothingWindow) {
      recentScores.shift();
    }

    // Check if N of M windows are above threshold
    const threshold = this.config.thresholds.get(signature) || 0.5;
    const aboveThreshold = recentScores.filter((s) => s >= threshold).length;

    if (aboveThreshold >= this.config.smoothingRequired) {
      // Emit flag
      this.state.lastFlagAtMs.set(signature, currentTimeMs);
      this.state.flagsEmitted++;

      // Clear recent scores after emission
      this.state.recentScores.set(signature, []);

      return result;
    }

    return null;
  }

  /**
   * Get current threshold state (counters only).
   */
  getStatus() {
    return {
      flagsEmitted: this.state.flagsEmitted,
      maxFlagsPerSession: this.config.maxFlagsPerSession,
      remainingFlags: this.config.maxFlagsPerSession - this.state.flagsEmitted,
    };
  }

  /**
   * Reset state (on session end).
   */
  reset(): void {
    this.state.flagsEmitted = 0;
    for (const signature of Object.values(DistressSignature)) {
      this.state.recentScores.set(signature, []);
      this.state.lastFlagAtMs.set(signature, 0);
    }
  }
}
