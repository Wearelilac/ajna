'use client';

import React from 'react';
import { useDemo } from '@/hooks/useDemo';
import { demoStore } from '@/demo/store';
import { CONSENT_COPY, type ConsentKey } from '@/demo/member';
import { Outcome } from './ui';
import { soundEffects } from '@/utils/sound';

const KEYS: { key: ConsentKey; icon: string }[] = [
  { key: 'wearable', icon: '⌚' },
  { key: 'acoustic', icon: '🎙️' },
  { key: 'population', icon: '🌐' },
  { key: 'outreach', icon: '📬' },
];

export function PrivacyScreen() {
  const { member } = useDemo();

  return (
    <div className="space-y-4 pb-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.24em] text-sand-500 font-semibold">
          Cryptographic Vault
        </p>
        <h1 className="font-serif text-3xl font-medium text-sand-900">Granular & Reversible</h1>
      </div>

      <Outcome
        tone="shield"
        kicker="Zero-Trust Architecture"
        title="Immediate System Enforcement"
        body="Toggling any scope updates the database RLS policies and local hardware permissions in real-time. Acoustic toggles wipe memory; population toggles exclude records from rollups."
      />

      {/* Security Architecture Badges */}
      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
        <div className="rounded-xl border border-sand-200 bg-sand-50 p-2.5">
          <p className="text-sand-500 text-[10px]">ENCRYPTION</p>
          <p className="font-semibold text-sand-900">AES-256-GCM Vaults</p>
        </div>
        <div className="rounded-xl border border-sand-200 bg-sand-50 p-2.5">
          <p className="text-sand-500 text-[10px]">ANONYMITY</p>
          <p className="font-semibold text-sand-900">K≥10 Strict Suppression</p>
        </div>
        <div className="rounded-xl border border-sand-200 bg-sand-50 p-2.5">
          <p className="text-sand-500 text-[10px]">AUDIO PIPELINE</p>
          <p className="font-semibold text-sand-900">0b Disk Persistence</p>
        </div>
        <div className="rounded-xl border border-sand-200 bg-sand-50 p-2.5">
          <p className="text-sand-500 text-[10px]">AUDIT CHAIN</p>
          <p className="font-semibold text-sand-900">SHA-256 Hash Chained</p>
        </div>
      </div>

      {/* Consent Toggles */}
      <div className="space-y-2.5">
        {KEYS.map(({ key, icon }) => {
          const on = member.consent[key];
          const copy = CONSENT_COPY[key];
          return (
            <button
              key={key}
              onClick={() => {
                soundEffects.playClick();
                demoStore.toggleConsent(key);
              }}
              className={`w-full rounded-2xl border p-4 text-left transition-all active:scale-[0.99] shadow-sm ${
                on
                  ? 'border-sand-300 bg-sand-0 hover:border-sand-400'
                  : 'border-sand-200 bg-sand-100/50 opacity-75'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{icon}</span>
                  <p className="font-medium text-sand-900 text-sm">{copy.title}</p>
                </div>

                {/* Tactile iOS-Style Switch */}
                <div
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                    on ? 'bg-sand-900' : 'bg-sand-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-sand-50 transition-transform duration-200 ${
                      on ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </div>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-sand-700">{copy.body}</p>
              
              <div className="mt-2.5 flex items-center justify-between border-t border-sand-200/60 pt-2 text-[10px] text-sand-500">
                <span>Active Scope: {key}</span>
                <span className="font-mono">{on ? 'ENFORCED (ALLOWED)' : 'RESTRICTED (BLOCKED)'}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-sand-200 bg-sand-100/60 p-3.5 text-xs text-sand-600 leading-relaxed">
        <p className="font-semibold text-sand-900 mb-1">Revocation Rights:</p>
        You hold an absolute right to revoke any consent tier at any time without loss of core device
        resilience radar. Revocations immediately write to the tamper-evident audit ledger.
      </div>
    </div>
  );
}
