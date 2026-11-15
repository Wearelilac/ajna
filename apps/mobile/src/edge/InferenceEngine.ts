/**
 * M3.1: InferenceEngine - On-device acoustic classification
 * Ported from P0.2 prototype
 *
 * In production, this loads a real ONNX/TFLite model.
 * For MVP, we use lightweight DSP-based classification.
 *
 * NO imports of: network, filesystem, storage
 */

import { DistressSignature, InferenceResult } from './types';

export interface InferenceConfig {
  modelVersion: string;
  thresholds: Map<DistressSignature, number>;
  windowSizeMs: number;
  sampleRate: number;
}

export class InferenceEngine {
  private modelVersion: string;
  private thresholds: Map<DistressSignature, number>;
  private windowSizeMs: number;
  private sampleRate: number;
  private windowSamples: number;

  // Metrics
  private inferenceCount: number = 0;
  private totalProcessingTimeMs: number = 0;

  constructor(config: InferenceConfig) {
    this.modelVersion = config.modelVersion;
    this.thresholds = config.thresholds;
    this.windowSizeMs = config.windowSizeMs;
    this.sampleRate = config.sampleRate;
    this.windowSamples = Math.floor(
      (config.windowSizeMs / 1000) * config.sampleRate,
    );
  }

  /**
   * Run inference on an audio window.
   * TODO: Replace with real ONNX Runtime or TFLite model loading.
   */
  infer(
    audioWindow: Float32Array,
    windowStartMs: number,
  ): InferenceResult | null {
    const startTime = Date.now();

    // Compute audio features (energy, zero-crossing rate)
    const energy = this.computeEnergy(audioWindow);
    const zcr = this.computeZeroCrossingRate(audioWindow);

    // Classify based on features
    const { signature, confidence } = this.classify(energy, zcr);

    const processingTimeMs = Date.now() - startTime;
    this.inferenceCount++;
    this.totalProcessingTimeMs += processingTimeMs;

    // Return result only if above threshold
    if (confidence > this.thresholds.get(signature)!) {
      return {
        signature,
        confidence: Math.round(confidence * 100) / 100, // 2 decimals
        windowStartMs,
        processingTimeMs,
      };
    }

    return null;
  }

  /**
   * Compute energy (RMS) of the audio window.
   */
  private computeEnergy(samples: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }

  /**
   * Compute zero-crossing rate (rough measure of frequency content).
   */
  private computeZeroCrossingRate(samples: Float32Array): number {
    let zcr = 0;
    for (let i = 1; i < samples.length; i++) {
      if (
        (samples[i] > 0 && samples[i - 1] <= 0) ||
        (samples[i] <= 0 && samples[i - 1] > 0)
      ) {
        zcr++;
      }
    }
    return zcr / (samples.length - 1);
  }

  /**
   * Classify based on audio features.
   * In production, this would be the model output.
   */
  private classify(
    energy: number,
    zcr: number,
  ): { signature: DistressSignature; confidence: number } {
    // High energy + moderate ZCR -> vocal tension spike
    if (energy > 0.15 && zcr > 0.1 && zcr < 0.4) {
      return {
        signature: DistressSignature.VOCAL_TENSION_SPIKE,
        confidence: Math.min(0.99, 0.5 + energy),
      };
    }

    // Very high energy + high ZCR -> distress signature
    if (energy > 0.25 && zcr > 0.3) {
      return {
        signature: DistressSignature.DISTRESS_SIGNATURE,
        confidence: Math.min(0.99, 0.6 + energy),
      };
    }

    // Low energy + very high ZCR -> hesitation/speech rate anomaly
    if (energy < 0.1 && zcr > 0.5) {
      return {
        signature: DistressSignature.SPEECH_RATE_ANOMALY,
        confidence: Math.min(0.99, 0.4 + zcr),
      };
    }

    // Mid-range patterns
    if (energy > 0.2 && zcr > 0.4) {
      return {
        signature: DistressSignature.PITCH_VARIANCE_HIGH,
        confidence: Math.min(0.99, 0.5 + zcr),
      };
    }

    // Sustained low energy
    if (energy < 0.05) {
      return {
        signature: DistressSignature.ENERGY_DROP_SUSTAINED,
        confidence: Math.min(0.99, 0.3 + energy * 5),
      };
    }

    // Default: verbal aggression or low confidence
    return {
      signature: DistressSignature.VERBAL_AGGRESSION_PATTERN,
      confidence: 0.1 + energy * 0.2,
    };
  }

  /**
   * Get inference metrics (counters only, no audio data).
   */
  getMetrics() {
    return {
      inferenceCount: this.inferenceCount,
      avgProcessingTimeMs:
        this.inferenceCount > 0
          ? this.totalProcessingTimeMs / this.inferenceCount
          : 0,
      modelVersion: this.modelVersion,
    };
  }
}
