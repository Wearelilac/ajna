/**
 * Inference Engine: Lightweight acoustic classification
 *
 * Simulates running a model (ONNX/TFLite) on audio windows.
 * In production (M3.1), this loads a real ONNX/TFLite model.
 * For P0.2, we simulate inference with realistic latency patterns.
 */

export enum DistressSignature {
  VOCAL_TENSION_SPIKE = "vocal_tension_spike",
  DISTRESS_SIGNATURE = "distress_signature",
  VERBAL_AGGRESSION_PATTERN = "verbal_aggression_pattern",
  HESITATION_CLUSTER = "hesitation_cluster",
}

export interface InferenceResult {
  signature: DistressSignature;
  confidence: number; // 0-1, rounded to 2 decimals
  windowStartMs: number;
  processingTimeMs: number;
}

export interface InferenceConfig {
  modelPath: string;
  modelVersion: string;
  thresholds: Map<DistressSignature, number>;
  windowSizeMs: number;
  sampleRate: number;
}

/**
 * Lightweight inference engine (simulated for P0.2).
 */
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
    this.windowSamples = Math.floor((config.windowSizeMs / 1000) * config.sampleRate);
  }

  /**
   * Run inference on an audio window.
   * In reality, this would call ONNX Runtime or TFLite.
   * For P0.2, we simulate with deterministic patterns.
   */
  public infer(audioWindow: Float32Array, windowStartMs: number): InferenceResult | null {
    const startTime = Date.now();

    // Simulate model inference (5-20 ms depending on window size)
    const processingTimeMs = this._simulateInferenceLatency();

    // Compute simple audio features (energy, zero-crossing)
    const energy = this._computeEnergy(audioWindow);
    const zcr = this._computeZeroCrossingRate(audioWindow);

    // Classify based on synthetic patterns
    const { signature, confidence } = this._classify(energy, zcr);

    this.inferenceCount++;
    this.totalProcessingTimeMs += processingTimeMs;

    // Return result only if above confidence threshold
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
  private _computeEnergy(samples: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }

  /**
   * Compute zero-crossing rate (rough measure of frequency content).
   */
  private _computeZeroCrossingRate(samples: Float32Array): number {
    let zcr = 0;
    for (let i = 1; i < samples.length; i++) {
      if ((samples[i] > 0 && samples[i - 1] <= 0) || 
          (samples[i] <= 0 && samples[i - 1] > 0)) {
        zcr++;
      }
    }
    return zcr / (samples.length - 1);
  }

  /**
   * Simulate classification based on features.
   * In production, this is the model output.
   */
  private _classify(
    energy: number,
    zcr: number
  ): { signature: DistressSignature; confidence: number } {
    // Synthetic patterns
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

    // Low energy + very high ZCR -> hesitation cluster (stuttering, ums)
    if (energy < 0.1 && zcr > 0.5) {
      return {
        signature: DistressSignature.HESITATION_CLUSTER,
        confidence: Math.min(0.99, 0.4 + zcr),
      };
    }

    // Default: verbal aggression or low confidence
    return {
      signature: DistressSignature.VERBAL_AGGRESSION_PATTERN,
      confidence: 0.1 + energy * 0.2, // Low confidence
    };
  }

  /**
   * Simulate model inference latency (5-20 ms).
   */
  private _simulateInferenceLatency(): number {
    return 5 + Math.random() * 15; // 5-20 ms
  }

  /**
   * Get inference metrics (counters only, no audio data).
   */
  public getMetrics() {
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
