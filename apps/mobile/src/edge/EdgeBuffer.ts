/**
 * M3.1: EdgeBuffer - Ephemeral ring buffer for audio (in-memory only)
 * Ported from P0.2 prototype
 *
 * Rules (from 00-data-protection-model.md):
 * - Never persisted
 * - Never transmitted
 * - Only in-memory, fixed-size ring buffer
 * - Overwritten continuously
 * - Zero-filled on session end, background, error
 * - No copies outside the buffer
 *
 * NO imports of: network, filesystem, storage, external logging
 */

import { EdgeBufferConfig, AudioWindow } from './types';

export class EdgeBuffer {
  private buffer: Float32Array;
  private writeIndex: number = 0;
  private filled: boolean = false;
  private readonly capacitySamples: number;
  private readonly sampleRate: number;

  // Metrics (counters only, no audio data)
  public windowsProcessed: number = 0;
  public bytesRead: number = 0;

  constructor(config: EdgeBufferConfig) {
    this.capacitySamples = config.capacitySamples;
    this.sampleRate = config.sampleRate;
    this.buffer = new Float32Array(this.capacitySamples);
    this.zeroFill();
  }

  /**
   * Write audio samples to the buffer (overwriting oldest).
   */
  write(samples: Float32Array): void {
    for (let i = 0; i < samples.length; i++) {
      this.buffer[this.writeIndex] = samples[i];
      this.writeIndex = (this.writeIndex + 1) % this.capacitySamples;

      if (this.writeIndex === 0) {
        this.filled = true;
      }
    }
  }

  /**
   * Read a window of samples for inference.
   */
  readWindow(windowSamples: number): AudioWindow {
    if (windowSamples > this.capacitySamples) {
      throw new Error(
        `Window size ${windowSamples} exceeds buffer capacity ${this.capacitySamples}`,
      );
    }

    const startIndex =
      (this.writeIndex - windowSamples + this.capacitySamples) %
      this.capacitySamples;

    this.windowsProcessed++;
    this.bytesRead += windowSamples * 4; // Float32 = 4 bytes per sample

    return {
      samples: this.getWindowSamples(startIndex, windowSamples),
      startIndex,
      endIndex: this.writeIndex,
    };
  }

  /**
   * Get a copy of a window.
   */
  private getWindowSamples(startIndex: number, length: number): Float32Array {
    const window = new Float32Array(length);

    if (startIndex + length <= this.capacitySamples) {
      // No wraparound
      window.set(this.buffer.subarray(startIndex, startIndex + length));
    } else {
      // Wraparound case
      const firstPart = this.capacitySamples - startIndex;
      window.set(this.buffer.subarray(startIndex, this.capacitySamples));
      window.set(this.buffer.subarray(0, length - firstPart), firstPart);
    }

    return window;
  }

  /**
   * Zero-fill the entire buffer.
   * Called on: session stop, app background, error.
   */
  zeroFill(): void {
    for (let i = 0; i < this.buffer.length; i++) {
      this.buffer[i] = 0;
    }
    this.writeIndex = 0;
    this.filled = false;
  }

  /**
   * Stop the buffer and zero-fill.
   * MUST be called on session end.
   */
  stop(): void {
    this.zeroFill();
  }

  /**
   * Get buffer status (counters only, never audio data).
   */
  getStatus() {
    return {
      filled: this.filled,
      writeIndex: this.writeIndex,
      windowsProcessed: this.windowsProcessed,
      bytesRead: this.bytesRead,
    };
  }

  /**
   * Verify all samples are zero (for tests only).
   */
  _allZero(): boolean {
    for (let i = 0; i < this.buffer.length; i++) {
      if (this.buffer[i] !== 0) {
        return false;
      }
    }
    return true;
  }
}
