/**
 * Web Audio API synthesizer for tactile, high-tier micro-interactions.
 * Zero external audio assets required; fully synthesized in browser.
 */

'use client';

let audioCtx: AudioContext | null = null;
let soundEnabled = false;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export const soundEffects = {
  isEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    const stored = window.localStorage.getItem('ajna-sound-fx');
    return stored === 'true';
  },

  setEnabled(enabled: boolean) {
    soundEnabled = enabled;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('ajna-sound-fx', enabled ? 'true' : 'false');
      if (enabled) {
        getContext();
        this.playClick();
      }
    }
  },

  toggle(): boolean {
    const next = !this.isEnabled();
    this.setEnabled(next);
    return next;
  },

  /**
   * Tactile micro-click (like mechanical watch / iOS haptic tap)
   */
  playClick() {
    if (!this.isEnabled()) return;
    const ctx = getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // Ignore audio failure
    }
  },

  /**
   * Harmonious warm chime for completed actions & confirmations
   */
  playSuccess() {
    if (!this.isEnabled()) return;
    const ctx = getContext();
    if (!ctx) return;

    try {
      const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5 major chord
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.04);

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + idx * 0.04 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.04 + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.04);
        osc.stop(ctx.currentTime + idx * 0.04 + 0.46);
      });
    } catch {
      // Ignore
    }
  },

  /**
   * Ephemeral memory sweep / RAM zero-fill sanitization sound
   */
  playWipe() {
    if (!this.isEnabled()) return;
    const ctx = getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.28);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.28);

      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.28);
    } catch {
      // Ignore
    }
  },

  /**
   * Gentle heartbeat pulse for biometric sync
   */
  playPulse() {
    if (!this.isEnabled()) return;
    const ctx = getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(85, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Ignore
    }
  },
};
