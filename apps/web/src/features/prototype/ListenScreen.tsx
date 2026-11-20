'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useDemo } from '@/hooks/useDemo';
import { demoStore } from '@/demo/store';
import type { ListenSession } from '@/demo/member';
import { Chip, Outcome, Sheet } from './ui';
import { AcousticVisualizer } from './AcousticVisualizer';
import { soundEffects } from '@/utils/sound';

type Mode = ListenSession['mode'];

export function ListenScreen() {
  const { member } = useDemo();
  const [mode, setMode] = useState<Mode>('morning');
  const [useRealMic, setUseRealMic] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState<{ jitter: number; energy: number; pitch: number } | null>(null);
  const [phase, setPhase] = useState<'idle' | 'running' | 'dissolving'>('idle');
  const [progress, setProgress] = useState(0);
  const [last, setLast] = useState<ListenSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAllowList, setShowAllowList] = useState(false);

  useEffect(() => {
    if (phase !== 'running') return;
    setProgress(0);
    const start = Date.now();
    const total = 3800; // Fast and responsive for high-tier interactive demo
    const t = setInterval(() => {
      const p = Math.min(100, ((Date.now() - start) / total) * 100);
      setProgress(p);
      if (p >= 100) {
        clearInterval(t);
        try {
          const session = demoStore.runListen(mode);
          setLast(session);
          setPhase('dissolving');
          soundEffects.playWipe();
          setTimeout(() => {
            setPhase('idle');
            soundEffects.playSuccess();
          }, 1400);
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Listen failed');
          setPhase('idle');
        }
      }
    }, 60);
    return () => clearInterval(t);
  }, [phase, mode]);

  if (!member.consent.acoustic) {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-sand-500 font-semibold">
            Privacy Vault Barrier
          </p>
          <h1 className="font-serif text-3xl text-sand-900">Listen is Inactive</h1>
        </div>
        <Outcome
          tone="shield"
          kicker="Hardware Isolation"
          title="On-device acoustic processing is toggled off"
          body="Microphone buffer is unallocated at the kernel level. Night Watch cannot arm. Open your Consent Vault to enable acoustic analysis."
        />
        <Link
          href="/app/privacy"
          className="block w-full rounded-full bg-sand-900 py-3 text-center text-sm font-medium text-sand-50 shadow hover:bg-sand-800 active:scale-95 transition-all"
        >
          Open Consent Vault
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-sand-500 font-semibold">
            Ephemeral Ring Buffer
          </p>
          <h1 className="font-serif text-3xl text-sand-900">Listen & Destroy</h1>
        </div>
        <button
          onClick={() => {
            soundEffects.playClick();
            setShowAllowList(true);
          }}
          className="rounded-full border border-sand-300 bg-sand-100/80 px-2.5 py-1 text-[11px] font-medium text-sand-700 hover:bg-sand-200 transition"
        >
          Allow-List
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {(['morning', 'ambient', 'night'] as Mode[]).map((m) => (
            <Chip
              key={m}
              active={mode === m}
              onClick={() => setMode(m)}
              badge={m === 'morning' ? '12s' : m === 'ambient' ? '30s' : 'Armable'}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </Chip>
          ))}
        </div>

        {/* Live Mic Toggle */}
        <button
          onClick={() => {
            soundEffects.playClick();
            setUseRealMic(!useRealMic);
          }}
          className={`rounded-full px-2.5 py-1 text-[11px] font-mono font-medium transition-all ${
            useRealMic
              ? 'bg-emerald-800 text-emerald-50 ring-1 ring-emerald-500'
              : 'border border-sand-300 bg-sand-100 text-sand-700 hover:bg-sand-200'
          }`}
        >
          {useRealMic ? '🎙️ Live Mic Active' : '🎤 Enable Live Mic'}
        </button>
      </div>

      <p className="text-xs text-sand-600 leading-relaxed">
        {mode === 'morning'
          ? 'Quick 12-second speech prosody & respiratory stability check against baseline.'
          : mode === 'ambient'
          ? 'Passive 30-second tone monitor for repetitive acoustic stress signals.'
          : 'Night Watch mode: foreground-only acoustic distress guard for acute nocturnal shifts.'}
        {useRealMic && (
          <span className="block mt-1 text-emerald-800 font-semibold font-mono text-[10px]">
            ⚡ Real hardware input enabled: Speak into your device to sample live prosody.
          </span>
        )}
      </p>

      {/* Dynamic Spectral & Ephemeral Memory Visualizer */}
      <AcousticVisualizer
        phase={phase}
        progress={progress}
        useRealMic={useRealMic}
        onMetricsUpdate={setLiveMetrics}
      />

      {liveMetrics && phase === 'running' && (
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-sand-100/90 p-2 text-center text-[10px] font-mono border border-sand-200">
          <div>
            <span className="text-sand-500 block text-[9px]">PITCH JITTER</span>
            <span className="font-semibold text-sand-900">{liveMetrics.jitter} SD</span>
          </div>
          <div>
            <span className="text-sand-500 block text-[9px]">RMS ENERGY</span>
            <span className="font-semibold text-sand-900">{liveMetrics.energy} dB</span>
          </div>
          <div>
            <span className="text-sand-500 block text-[9px]">CENTROID</span>
            <span className="font-semibold text-sand-900">{liveMetrics.pitch} Hz</span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <button
          disabled={phase !== 'idle'}
          onClick={() => {
            soundEffects.playClick();
            setError(null);
            setPhase('running');
          }}
          className="w-full rounded-full bg-sand-900 py-3 text-sm font-medium text-sand-50 shadow-md hover:bg-sand-800 disabled:opacity-50 active:scale-[0.98] transition-all"
        >
          {phase === 'idle'
            ? `Run ${mode} Acoustic Sample`
            : phase === 'running'
            ? 'Analyzing on device…'
            : 'Zero-filling memory…'}
        </button>

        <button
          onClick={() => {
            soundEffects.playClick();
            try {
              demoStore.toggleNightWatch();
              setError(null);
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Cannot arm');
            }
          }}
          className={`w-full rounded-2xl border p-3 text-sm font-medium flex items-center justify-between transition-all ${
            member.nightWatch
              ? 'border-clay bg-sand-900 text-sand-50 shadow-sm'
              : 'border-sand-200 bg-sand-100/90 text-sand-800 hover:bg-sand-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                member.nightWatch ? 'bg-amber-400 animate-pulse' : 'bg-sand-400'
              }`}
            />
            <span>Night Watch Guard</span>
          </div>
          <span className="text-xs opacity-80">
            {member.nightWatch ? 'Armed (Foreground)' : 'Standby (Tap to arm)'}
          </span>
        </button>
      </div>

      {error && <Outcome tone="advisory" kicker="Blocked" title="Execution Halted" body={error} />}

      {last && (
        <Outcome
          tone={last.outcome === 'discarded_calm' ? 'success' : 'advisory'}
          kicker={last.audioDestroyed ? 'Zero-Fill Confirmed' : 'Memory Buffer'}
          title={
            last.outcome === 'discarded_calm'
              ? 'Normal Resonance — Audio Destroyed'
              : `Advisory Signal Detected · ${last.signature?.replace(/_/g, ' ')}`
          }
          body={
            last.outcome === 'discarded_calm'
              ? 'On-device model classified session inside normal variance. Ring buffer zero-filled. 0 bytes left device.'
              : `Confidence: ${Math.round(
                  (last.confidence || 0) * 100,
                )}%. A de-identified advisory flag was forwarded to the human crisis review queue. Audio was immediately sanitized from memory.`
          }
        />
      )}

      {/* Session Log */}
      <section className="pt-1">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-serif text-lg text-sand-900">Acoustic Session Audit</h2>
          <span className="text-xs text-sand-500 font-mono">RAM zero-fill verified</span>
        </div>
        {member.sessions.length === 0 ? (
          <p className="rounded-2xl border border-sand-200 bg-sand-50 p-3.5 text-xs text-sand-600">
            No acoustic sessions run yet in this seed. Tap above to trigger a live sample.
          </p>
        ) : (
          <ul className="space-y-2">
            {member.sessions.slice(0, 4).map((s) => (
              <li
                key={s.id}
                className="rounded-2xl border border-sand-200 bg-sand-0 p-3 text-xs shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sand-900 capitalize">
                    {s.mode} analysis
                  </span>
                  <span className="font-mono text-[10px] text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                    0b audio stored
                  </span>
                </div>
                <p className="mt-1 text-sand-700">
                  {s.outcome === 'discarded_calm'
                    ? 'Discarded (no repeating pattern)'
                    : `Flagged (${s.signature?.replace(/_/g, ' ')})`}
                </p>
                {s.reviewId && (
                  <p className="mt-1 font-mono text-[10px] text-sand-500">
                    Forwarded to Staff Queue: {s.reviewId}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 7-Field Allow-List Disclosing Drawer */}
      {showAllowList && (
        <Sheet
          title="7-Field Privacy Allow-List"
          subtitle="Cryptographically verified: Raw audio, recordings, and transcripts NEVER leave the device."
          onClose={() => setShowAllowList(false)}
        >
          <div className="space-y-3 pt-2">
            <div className="rounded-2xl bg-sand-100 p-3.5 text-xs text-sand-800">
              <p className="font-semibold text-sand-900 mb-1">Strict Structural Allow-List:</p>
              <p>Only these 7 non-PII numerical fields are permitted in network payloads:</p>
              <ol className="mt-2 list-decimal pl-4 space-y-1 font-mono text-[11px] text-sand-700">
                <li><code>timestamp</code> (ISO-8601)</li>
                <li><code>session_duration_ms</code> (integer)</li>
                <li><code>model_version</code> (semantic string)</li>
                <li><code>signal_signature</code> (enum: prosody_drift, nocturnal_spike, etc.)</li>
                <li><code>confidence_score</code> (float 0.0 - 1.0)</li>
                <li><code>de_identified_subject_token</code> (ephemeral hash)</li>
                <li><code>ephemerality_proof_nonce</code> (SHA-256 ring zero-fill proof)</li>
              </ol>
            </div>

            <div className="rounded-2xl border border-clay/30 bg-sand-50 p-3 text-xs text-sand-700">
              <span className="font-semibold text-sand-900">Guaranteed Discarded:</span>
              <p className="mt-1">
                Audio waveforms, spectrogram images, speech-to-text transcripts, acoustic voiceprints, and ambient background sounds are completely zero-filled in RAM within milliseconds of feature extraction.
              </p>
            </div>
          </div>
        </Sheet>
      )}
    </div>
  );
}
