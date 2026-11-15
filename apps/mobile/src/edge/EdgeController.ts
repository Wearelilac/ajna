/**
 * M3.1: EdgeController - Main API for acoustic engine
 *
 * API:
 * - start({ sessionId, maxDurationSec })
 * - stop()
 * - status() -> EdgeStatus (counters only)
 *
 * Callbacks:
 * - onFlag: (flag: DeIdentifiedFlag) => void
 * - onIndicator: (isListening: boolean) => void (REQUIRED)
 *
 * Lifecycle:
 * - Stops on: user stop, cap reached, background, interruption, consent revoked, error
 * - Zero-fills buffer on all stop paths
 *
 * NO imports of: network, filesystem, storage
 */

import { EdgeBuffer } from './EdgeBuffer';
import { InferenceEngine } from './InferenceEngine';
import { ThresholdEngine } from './ThresholdEngine';
import { FlagBuilder } from './FlagBuilder';
import { AudioSource } from './AudioSource';
import {
  EdgeControllerConfig,
  EdgeStatus,
  DistressSignature,
} from './types';

export class EdgeController {
  private buffer: EdgeBuffer | null = null;
  private audioSource: AudioSource | null = null;
  private inferenceEngine: InferenceEngine | null = null;
  private thresholdEngine: ThresholdEngine | null = null;

  private config: EdgeControllerConfig | null = null;
  private sessionStartMs: number = 0;
  private inferenceIntervalId: NodeJS.Timeout | null = null;

  private isRunning: boolean = false;

  /**
   * Start the acoustic engine.
   * Throws if indicator callback not provided.
   */
  async start(config: EdgeControllerConfig): Promise<void> {
    if (this.isRunning) {
      throw new Error('EdgeController already running');
    }

    if (!config.onIndicator) {
      throw new Error('Indicator callback is required');
    }

    this.config = config;
    this.sessionStartMs = Date.now();

    // Initialize buffer (10 seconds @ 16kHz)
    this.buffer = new EdgeBuffer({
      capacitySamples: 160000, // 16kHz * 10s
      sampleRate: 16000,
    });

    // Initialize inference engine
    this.inferenceEngine = new InferenceEngine({
      modelVersion: config.modelVersion,
      thresholds: config.thresholds,
      windowSizeMs: 1000, // 1-second windows
      sampleRate: 16000,
    });

    // Initialize threshold engine
    this.thresholdEngine = new ThresholdEngine({
      thresholds: config.thresholds,
      smoothingWindow: 5, // M = 5 windows
      smoothingRequired: 3, // N = 3 of 5
      cooldownMs: 5000, // 5 seconds between flags
      maxFlagsPerSession: 100, // From P0.2 limits
    });

    // Initialize audio source
    this.audioSource = new AudioSource(
      {
        sampleRate: 16000,
        channels: 1,
        bufferSize: 1600, // 100ms frames
      },
      this.buffer,
    );

    // Show indicator BEFORE starting audio
    config.onIndicator(true);

    // Start audio capture
    await this.audioSource.start();

    // Start inference loop (every 500ms)
    this.isRunning = true;
    this.inferenceIntervalId = setInterval(() => {
      this.runInference();
    }, 500);

    // Set auto-stop timer
    setTimeout(() => {
      if (this.isRunning) {
        this.stop('timeout');
      }
    }, config.maxDurationSec * 1000);
  }

  /**
   * Stop the acoustic engine.
   * Reason: 'user_stopped' | 'timeout' | 'background' | 'error' | 'consent_revoked'
   */
  stop(reason: string = 'user_stopped'): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Stop inference loop
    if (this.inferenceIntervalId) {
      clearInterval(this.inferenceIntervalId);
      this.inferenceIntervalId = null;
    }

    // Stop audio capture
    if (this.audioSource) {
      this.audioSource.stop();
    }

    // Zero-fill buffer (CRITICAL for ephemerality)
    if (this.buffer) {
      this.buffer.stop();
    }

    // Reset threshold engine
    if (this.thresholdEngine) {
      this.thresholdEngine.reset();
    }

    // Hide indicator
    if (this.config?.onIndicator) {
      this.config.onIndicator(false);
    }

    // Log stop reason (metrics only)
    console.log(`EdgeController stopped: ${reason}`);
  }

  /**
   * Run inference on current window.
   */
  private runInference(): void {
    if (!this.buffer || !this.inferenceEngine || !this.thresholdEngine) {
      return;
    }

    try {
      // Read window from buffer (1 second = 16,000 samples)
      const window = this.buffer.readWindow(16000);

      // Run inference
      const currentTimeMs = Date.now();
      const inferenceResult = this.inferenceEngine.infer(
        window.samples,
        currentTimeMs - this.sessionStartMs,
      );

      // Check thresholds
      const shouldEmit = this.thresholdEngine.shouldEmitFlag(
        inferenceResult,
        currentTimeMs,
      );

      if (shouldEmit && this.config) {
        // Build flag
        const flag = FlagBuilder.build(
          shouldEmit,
          this.config.sessionId,
          this.config.modelVersion,
          this.sessionStartMs,
        );

        // Validate flag
        if (!FlagBuilder.validate(flag)) {
          console.error('Flag validation failed');
          return;
        }

        // Reject audio types
        FlagBuilder.rejectAudioTypes(flag);

        // Emit flag
        this.config.onFlag(flag);
      }
    } catch (error) {
      console.error('Inference error:', error);
      this.stop('error');
    }
  }

  /**
   * Get current status (counters only, no audio data).
   */
  status(): EdgeStatus {
    const elapsedMs = this.isRunning ? Date.now() - this.sessionStartMs : 0;
    const remainingMs = this.config
      ? Math.max(0, this.config.maxDurationSec * 1000 - elapsedMs)
      : 0;

    return {
      isListening: this.isRunning,
      windowsProcessed: this.buffer?.windowsProcessed || 0,
      flagsEmitted: this.thresholdEngine?.getStatus().flagsEmitted || 0,
      elapsedMs,
      remainingMs,
    };
  }

  /**
   * Handle app backgrounding (MUST stop and zero-fill).
   */
  onBackground(): void {
    if (this.isRunning) {
      this.stop('background');
    }
  }

  /**
   * Handle consent revocation (MUST stop immediately).
   */
  onConsentRevoked(): void {
    if (this.isRunning) {
      this.stop('consent_revoked');
    }
  }
}

// Singleton instance
let edgeControllerInstance: EdgeController | null = null;

export function getEdgeController(): EdgeController {
  if (!edgeControllerInstance) {
    edgeControllerInstance = new EdgeController();
  }
  return edgeControllerInstance;
}
