/**
 * Edge Buffer: Ephemeral ring buffer for audio (in-memory only)
 *
 * Rules (from 00-data-protection-model.md):
 * - Never persisted
 * - Never transmitted
 * - Only in-memory, fixed-size ring buffer
 * - Overwritten continuously
 * - Zero-filled on session end, background, error
 * - No copies outside the buffer
 *
 * This file has NO imports of:
 * - Network (fetch, XMLHttpRequest, WebSocket)
 * - Filesystem (fs, path)
 * - Storage (localStorage, sessionStorage, AsyncStorage)
 * - Logging to external services
 */

export interface EdgeBufferConfig {
  capacitySamples: number;  // 16 kHz × 10 sec = 160,000 samples
  sampleRate: number;        // Typically 16,000 Hz
}

export interface AudioWindow {
  samples: Float32Array;
  startIndex: number;
  endIndex: number;
}

/**
 * Ring buffer for continuous audio capture.
 * Never persists to disk or network.
 */
export class EdgeBuffer {
  private buffer: Float32Array;
  private writeIndex: number = 0;
  private filled: boolean = false;
  private readonly capacitySamples: number;
  private readonly sampleRate: number;

  // Metrics (counters only, no audio data)
  public windowsProcessed: number = 0;
  public flagsEmitted: number = 0;
  public bytesRead: number = 0;

  constructor(config: EdgeBufferConfig) {
    this.capacitySamples = config.capacitySamples;
    this.sampleRate = config.sampleRate;
    this.buffer = new Float32Array(this.capacitySamples);
    this._zeroFill();
  }

  /**
   * Write audio samples to the buffer (overwriting oldest).
   * @param samples - New audio samples to append
   */
  public write(samples: Float32Array): void {
    for (let i = 0; i < samples.length; i++) {
      this.buffer[this.writeIndex] = samples[i];
      this.writeIndex = (this.writeIndex + 1) % this.capacitySamples;
      
      // Mark buffer as full after first wraparound
      if (this.writeIndex === 0) {
        this.filled = true;
      }
    }
  }

  /**
   * Read a window of samples for inference.
   * @param windowSamples - Number of samples to read
   * @returns AudioWindow with view of buffer (not a copy)
   */
  public readWindow(windowSamples: number): AudioWindow {
    if (windowSamples > this.capacitySamples) {
      throw new Error(
        `Window size ${windowSamples} exceeds buffer capacity ${this.capacitySamples}`
      );
    }

    const startIndex = (this.writeIndex - windowSamples + this.capacitySamples) % this.capacitySamples;
    
    this.windowsProcessed++;
    this.bytesRead += windowSamples * 4; // Float32 = 4 bytes per sample

    return {
      samples: this._getWindowSamples(startIndex, windowSamples),
      startIndex,
      endIndex: this.writeIndex,
    };
  }

  /**
   * Get a copy of a window (only for external use, internal reads use reference).
   */
  private _getWindowSamples(startIndex: number, length: number): Float32Array {
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
  private _zeroFill(): void {
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
  public stop(): void {
    this._zeroFill();
  }

  /**
   * Get buffer status (counters only, never audio data).
   */
  public getStatus() {
    return {
      filled: this.filled,
      writeIndex: this.writeIndex,
      windowsProcessed: this.windowsProcessed,
      flagsEmitted: this.flagsEmitted,
      bytesRead: this.bytesRead,
    };
  }

  /**
   * Verify all samples are zero (for tests only).
   */
  public _allZero(): boolean {
    for (let i = 0; i < this.buffer.length; i++) {
      if (this.buffer[i] !== 0) {
        return false;
      }
    }
    return true;
  }
}
