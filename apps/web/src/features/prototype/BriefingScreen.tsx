'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useDemo } from '@/hooks/useDemo';
import { Outcome } from './ui';
import { soundEffects } from '@/utils/sound';

export function BriefingScreen() {
  const { member, reviews, drafts, clusters } = useDemo();
  const [sent, setSent] = useState(false);

  const lines = useMemo(() => {
    const open = reviews.filter((r) => r.state !== 'closed');
    const closed = reviews.filter((r) => r.state === 'closed');
    const pending = drafts.filter((d) => d.status === 'draft' || d.status === 'in_review');
    const delivered = member.inbox.length;
    return [
      `Member phone state: ${member.scenario.replace(/_/g, ' ')} with current Personal Resilience Index of ${member.pri}.`,
      `Night Watch status: ${member.nightWatch ? 'Armed' : 'Standby'}; Acoustic Consent is ${member.consent.acoustic ? 'Active' : 'Gated'}.`,
      `${open.length} crisis items pending human triage, ${closed.length} closed this cycle, ${reviews.filter((r) => r.id.startsWith('rev-live')).length} minted directly from on-device acoustic detection.`,
      `${pending.length} care-gap drafts awaiting clinician sign-off. ${delivered} validated notes successfully delivered to Maya’s inbox.`,
      `Top underserved cluster: ${clusters[0]?.label ?? 'N/A'} (deprivation vector score ${clusters[0]?.score ?? '—'}).`,
      member.sessions[0]
        ? `Last acoustic session: ${member.sessions[0].outcome.replace(/_/g, ' ')}${member.sessions[0].signature ? ` (${member.sessions[0].signature})` : ''} · 0b audio persisted.`
        : 'No acoustic sessions recorded during current session cycle.',
    ];
  }, [member, reviews, drafts, clusters]);

  return (
    <div className="space-y-4 pb-4">
      <div>
        <Link
          href="/app/desk"
          onClick={() => soundEffects.playClick()}
          className="text-xs text-sand-600 hover:text-sand-900 flex items-center gap-1 mb-1"
        >
          <span>←</span> Back to Staff Desk
        </Link>
        <p className="text-[11px] uppercase tracking-[0.22em] text-sand-500 font-semibold">
          Daily Synthesis
        </p>
        <h1 className="font-serif text-3xl font-medium text-sand-900">Executive Briefing</h1>
        <p className="text-xs text-sand-600 mt-1">
          Dynamic rollup composed from current wearable telemetry, crisis queues, and community
          clusters.
        </p>
      </div>

      {/* Briefing Card */}
      <article className="rounded-3xl border border-sand-300 bg-sand-100/90 p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-sand-200/80 pb-3">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-clay font-semibold">
              BAYVIEW CLINICAL DESK DISPATCH
            </p>
            <p className="font-serif text-xl font-medium text-sand-900 mt-0.5">
              Morning Operations Briefing
            </p>
          </div>
          <span className="font-mono text-xs text-sand-600 bg-sand-200/80 px-2 py-1 rounded">
            {new Date().toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>

        <ol className="mt-4 list-decimal space-y-2.5 pl-4 text-xs leading-relaxed text-sand-800">
          {lines.map((l, i) => (
            <li key={i} className="pl-1">
              {l}
            </li>
          ))}
        </ol>

        <div className="mt-4 pt-3 border-t border-sand-200/60 flex items-center justify-between text-[10px] font-mono text-sand-500">
          <span>CLASSIFICATION: ADVISORY ONLY</span>
          <span>COMPLIANCE: 0 PHI LEAKAGE</span>
        </div>
      </article>

      {/* Dispatch Simulation */}
      <button
        onClick={() => {
          soundEffects.playSuccess();
          setSent(true);
        }}
        className="w-full rounded-full bg-sand-900 py-3 text-xs font-semibold uppercase tracking-wider text-sand-50 shadow hover:bg-sand-800 active:scale-95 transition-all"
      >
        Transmit to Clinical Leadership (Simulated)
      </button>

      {sent && (
        <Outcome
          tone="success"
          kicker="Secure Transmission"
          title="Executive Briefing Dispatched"
          body="Packet transmitted to authorized clinical supervisors. Fully de-identified; aggregate vector scores and triage state counts only. No PHI or acoustic waveforms attached."
        />
      )}

      {/* Audit Source Journal */}
      <section className="pt-2">
        <h2 className="font-serif text-lg font-medium text-sand-900 mb-2">Source Telemetry Beats</h2>
        <ul className="space-y-2">
          {member.journal.slice(0, 6).map((j) => (
            <li
              key={j.id}
              className="rounded-2xl border border-sand-200 bg-sand-0 p-3 text-xs shadow-sm flex items-center justify-between"
            >
              <div>
                <span className="font-semibold text-sand-900 capitalize block">{j.title}</span>
                <span className="text-[10px] text-sand-500 font-mono">{j.kind}</span>
              </div>
              <span className="text-[10px] font-mono text-sand-400">
                {new Date(j.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
