/**
 * M3.1: AudioSource - Wrapper for audio capture library
 *
 * Wraps react-native-audio-api (recommended in P0.2 findings)
 * Exposes frames only to the ring buffer.
 *
 * NO imports of: network, filesystem, storage
 */

import { EdgeBuffer } from './EdgeBuffer';

export interface AudioConfig {
  sampleRate: number; // 16,000 Hz
  channels: number; // 1 (mono)
  bufferSize: number; // Frames per callback
}

/**
 * Audio capture wrapper.
 * In production, this would use react-native-audio-api.
 * For now, we provide a mock interface.
 */
export class AudioSource {
  private config: AudioConfig;
  private isCapturing: boolean = false;
  private buffer: EdgeBuffer;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(config: AudioConfig, buffer: EdgeBuffer) {
    this.config = config;
    this.buffer = buffer;
  }

  /**
   * Start audio capture.
   * In production, this would call react-native-audio-api.
   */
  async start(): Promise<void> {
    if (this.isCapturing) {
      return;
    }

    // TODO: Replace with real audio capture
    // For MVP, we simulate with synthetic audio
    this.isCapturing = true;

    // Simulate audio frames arriving every 100ms
    this.intervalId = setInterval(() => {
      if (!this.isCapturing) {
        return;
      }

      // Generate synthetic audio (16kHz * 0.1s = 1600 samples per frame)
      const frameSize = Math.floor(this.config.sampleRate * 0.1);
      const frame = new Float32Array(frameSize);

      // Fill with synthetic data (noise + sine wave)
      for (let i = 0; i < frameSize; i++) {
        const t = i / this.config.sampleRate;
        const sine = Math.sin(2 * Math.PI * 440 * t); // 440 Hz tone
        const noise = (Math.random() - 0.5) * 0.1; // Noise
        frame[i] = sine * 0.3 + noise;
      }

      // Write to buffer
      this.buffer.write(frame);
    }, 100);
  }

  /**
   * Stop audio capture and release microphone.
   */
  stop(): void {
    if (!this.isCapturing) {
      return;
    }

    this.isCapturing = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // TODO: Release microphone permission in production
  }

  /**
   * Check if currently capturing.
   */
  isActive(): boolean {
    return this.isCapturing;
  }
}
