'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useDemo } from '@/hooks/useDemo';
import { demoStore } from '@/demo/store';
import type { CrisisOutcome, CrisisReviewState } from '@/features/crisis-reviews/types';
import { Chip, Outcome, Sheet } from './ui';
import { soundEffects } from '@/utils/sound';

const STATES: Array<CrisisReviewState | 'all'> = ['all', 'new', 'assigned', 'in_review', 'closed'];

export function ReviewsMobile() {
  const { reviews } = useDemo();
  const [filter, setFilter] = useState<CrisisReviewState | 'all'>('all');
  const list = reviews.filter((r) => (filter === 'all' ? true : r.state === filter));

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
          Triage Console
        </p>
        <h1 className="font-serif text-3xl font-medium text-sand-900">Crisis Queue</h1>
      </div>

      <div className="rounded-2xl border border-sand-200 bg-sand-100/70 p-3 text-xs text-sand-700 leading-relaxed">
        <p className="font-semibold text-sand-900">Advisory Review SLA: 15 minutes</p>
        Signals represent non-diagnostic acoustic shifts. This console coordinates internal clinical
        outreach — it never pages municipal 911 or dispatches emergency services directly.
      </div>

      <div className="flex flex-wrap gap-2">
        {STATES.map((s) => (
          <Chip key={s} active={filter === s} onClick={() => setFilter(s)}>
            {s.replace(/_/g, ' ')}
          </Chip>
        ))}
      </div>

      {list.length === 0 ? (
        <Outcome
          tone="neutral"
          kicker="Queue Clear"
          title="No Items in This View"
          body="Run an acoustic listen on the member phone in Acute Deviation mode to mint a live event."
        />
      ) : (
        <ul className="space-y-2.5">
          {list.map((r) => (
            <li key={r.id}>
              <Link
                href={`/app/desk/reviews/${r.id}`}
                onClick={() => soundEffects.playClick()}
                className="group block rounded-2xl border border-sand-200 bg-sand-0 p-3.5 shadow-sm hover:border-sand-300 hover:shadow transition-all active:scale-[0.99]"
              >
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-medium ${
                      r.state === 'new'
                        ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-300'
                        : r.state === 'in_review'
                        ? 'bg-blue-100 text-blue-900 ring-1 ring-blue-300'
                        : r.state === 'closed'
                        ? 'bg-sand-200 text-sand-700'
                        : 'bg-sand-100 text-sand-800'
                    }`}
                  >
                    {r.state.toUpperCase()}
                  </span>
                  <span className="font-mono text-[11px] text-sand-500">
                    {r.flagCount} {r.flagCount === 1 ? 'flag' : 'flags'}
                  </span>
                </div>

                <p className="mt-2 font-serif text-base font-semibold text-sand-900 group-hover:text-clay transition-colors capitalize">
                  {r.flags?.[0]?.signature?.replace(/_/g, ' ') || 'De-Identified Pattern'}
                </p>

                <div className="mt-2 flex items-center justify-between text-[11px] text-sand-600 border-t border-sand-100 pt-2">
                  <span className="font-mono">
                    {r.id.startsWith('rev-live') ? '✨ Live Phone Event' : 'Seeded Case'}
                  </span>
                  <span className="font-mono text-sand-400">ID: {r.id.slice(0, 14)}…</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const OUTCOMES: { id: CrisisOutcome; label: string; detail: string }[] = [
  {
    id: 'no_action',
    label: 'No Action Required',
    detail: 'Acoustic pattern explained by transient environmental context. Journal quietly records closure.',
  },
  {
    id: 'routine_follow_up_requested',
    label: 'Routine Follow-Up',
    detail: 'If outreach consent is active, Maya receives a non-urgent check-in in her inbox.',
  },
  {
    id: 'escalated_to_clinical_lead',
    label: 'Escalate to Clinical Lead',
    detail: 'Internal organization procedure for peer review. No automatic 911 dispatch.',
  },
];

export function ReviewDetailMobile({ reviewId }: { reviewId: string }) {
  const snap = useDemo();
  const review = snap.reviews.find((r) => r.id === reviewId);
  const events = useMemo(
    () => snap.events.filter((e) => e.reviewId === reviewId),
    [snap.events, reviewId],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closeOpen, setCloseOpen] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [revealed, setRevealed] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setFlash(ok);
      soundEffects.playSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  if (!review) {
    return (
      <div className="space-y-4">
        <Link href="/app/desk/reviews" className="text-xs text-sand-600">
          ← Back to Crisis Queue
        </Link>
        <Outcome kicker="Missing" title="Review Not Found" body="Item may have been cleared by a demo reset." />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div>
        <Link
          href="/app/desk/reviews"
          onClick={() => soundEffects.playClick()}
          className="text-xs text-sand-600 hover:text-sand-900 flex items-center gap-1 mb-1"
        >
          <span>←</span> Back to Crisis Queue
        </Link>
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.24em] text-sand-500 font-semibold">
            Triage Investigation
          </p>
          <span className="font-mono text-xs text-sand-500">{review.id}</span>
        </div>
        <h1 className="font-serif text-3xl font-medium text-sand-900 capitalize">
          {review.state.replace(/_/g, ' ')}
        </h1>
      </div>

      {flash && <Outcome tone="success" kicker="Action Complete" title="Workflow Advanced" body={flash} />}
      {error && <Outcome tone="advisory" kicker="Blocked" title="Transition Invalid" body={error} />}
      {revealed && (
        <Outcome
          tone="shield"
          kicker="De-Anonymized Vault Read"
          title="Contact Decrypted & Audited"
          body={revealed}
        />
      )}

      {/* Acoustic Signature Cards */}
      <div className="rounded-2xl border border-sand-200 bg-sand-0 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs border-b border-sand-100 pb-2">
          <span className="font-medium text-sand-800">
            {review.flagCount} Acoustic Deviation Signal(s)
          </span>
          <span className="font-mono text-[10px] text-sand-500">
            Escalated: {review.escalatedToLead ? 'YES' : 'NO'}
          </span>
        </div>

        {/* Feature Spectrogram Simulation */}
        <div className="rounded-xl bg-sand-900 p-3 text-sand-50 font-mono text-[11px]">
          <div className="flex items-center justify-between text-[10px] text-sand-400 mb-2">
            <span>DE-IDENTIFIED PROSODY FEATURES</span>
            <span className="text-emerald-400">0% AUDIO ATTACHED</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-sand-800 p-2 rounded">
              <span className="text-sand-400 block text-[9px]">PITCH JITTER</span>
              <span className="font-semibold text-amber-300">+2.8 SD</span>
            </div>
            <div className="bg-sand-800 p-2 rounded">
              <span className="text-sand-400 block text-[9px]">SPEECH TEMPO</span>
              <span className="font-semibold text-sand-100">-34%</span>
            </div>
            <div className="bg-sand-800 p-2 rounded">
              <span className="text-sand-400 block text-[9px]">MODEL CONF</span>
              <span className="font-semibold text-emerald-300">
                {Math.round((review.flags?.[0]?.confidence || 0.88) * 100)}%
              </span>
            </div>
          </div>
        </div>

        <ul className="space-y-2">
          {(review.flags || []).map((f) => (
            <li key={f.id} className="rounded-xl bg-sand-100/70 p-3 text-xs">
              <p className="font-semibold text-sand-900 capitalize">
                {f.signature.replace(/_/g, ' ')}
              </p>
              <p className="mt-0.5 text-sand-600 font-mono text-[10px]">
                Model: {f.modelVersion} · Confidence: {Math.round(f.confidence * 100)}%
              </p>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {review.state === 'new' && (
          <button
            disabled={busy}
            onClick={() =>
              act(
                () => demoStore.assign(review.id, 'current-user-id'),
                'Case assigned to your clinical review queue.',
              )
            }
            className="flex-1 rounded-full bg-sand-900 py-3 text-xs font-semibold uppercase tracking-wider text-sand-50 shadow hover:bg-sand-800 active:scale-95 transition-all"
          >
            Assign To Me
          </button>
        )}

        {review.state === 'assigned' && (
          <button
            disabled={busy}
            onClick={() =>
              act(
                () => demoStore.transition(review.id, 'in_review', undefined, 'Active review begun'),
                'Status set to In Review. Ready for clinical disposition.',
              )
            }
            className="flex-1 rounded-full bg-sand-900 py-3 text-xs font-semibold uppercase tracking-wider text-sand-50 shadow hover:bg-sand-800 active:scale-95 transition-all"
          >
            Begin Clinical Evaluation
          </button>
        )}

        {review.state === 'in_review' && (
          <button
            disabled={busy}
            onClick={() => {
              soundEffects.playClick();
              setCloseOpen(true);
            }}
            className="flex-1 rounded-full bg-sand-900 py-3 text-xs font-semibold uppercase tracking-wider text-sand-50 shadow hover:bg-sand-800 active:scale-95 transition-all"
          >
            Record Clinical Outcome
          </button>
        )}

        <button
          disabled={busy}
          onClick={() => {
            soundEffects.playClick();
            setRevealOpen(true);
          }}
          className="rounded-full border border-sand-400 bg-sand-100 px-4 py-3 text-xs font-medium text-sand-800 hover:bg-sand-200 active:scale-95 transition-all"
        >
          Decrypt Contact Info
        </button>
      </div>

      {/* State Transitions Audit */}
      <section className="pt-2">
        <h2 className="font-serif text-lg font-medium text-sand-900 mb-2">Immutable Audit Chain</h2>
        {events.length === 0 ? (
          <p className="text-xs text-sand-600">No transitions logged yet.</p>
        ) : (
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id} className="rounded-xl border border-sand-200 bg-sand-0 p-3 text-xs shadow-sm">
                <div className="flex items-center justify-between font-mono text-[10px] text-sand-500">
                  <span>TRANSITION</span>
                  <span>{new Date().toLocaleTimeString()}</span>
                </div>
                <p className="mt-1 font-semibold text-sand-900">
                  {e.fromState} ➔ {e.toState}
                </p>
                <p className="mt-0.5 text-sand-600 italic">{e.reason || 'No clinical reason provided'}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Record Outcome Drawer */}
      {closeOpen && (
        <Sheet
          title="Clinical Disposition"
          subtitle="Select outcome based on review guidelines."
          onClose={() => setCloseOpen(false)}
        >
          <div className="space-y-2.5 pt-2">
            {OUTCOMES.map((o) => (
              <button
                key={o.id}
                disabled={busy}
                onClick={() =>
                  act(async () => {
                    await demoStore.transition(review.id, 'closed', o.id, o.label);
                    setCloseOpen(false);
                  }, o.detail)
                }
                className="w-full rounded-2xl border border-sand-200 bg-sand-100/70 p-3.5 text-left hover:bg-sand-200/80 transition-all active:scale-[0.99]"
              >
                <p className="font-semibold text-sm text-sand-900">{o.label}</p>
                <p className="mt-1 text-xs text-sand-600 leading-relaxed">{o.detail}</p>
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {/* Reveal Contact Modal */}
      {revealOpen && (
        <Sheet
          title="Cryptographic Contact Decryption"
          subtitle="Zero-Trust Audit: Minimum 20 characters required. Appends to SHA-256 ledger."
          onClose={() => setRevealOpen(false)}
        >
          <div className="space-y-3 pt-2">
            <p className="text-xs text-sand-700 leading-relaxed">
              Contact information is held in an AES-256-GCM encrypted vault. Accessing emergency
              contact fields writes an immutable audit record visible to compliance officers.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-28 w-full rounded-2xl border border-sand-300 bg-sand-50 p-3 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-clay"
              placeholder="Clinical reason: Repeated nocturnal deviation requires verification of safety protocol per Bayview procedure..."
            />
            <div className="flex items-center justify-between text-[11px] text-sand-500 font-mono">
              <span>Length: {reason.trim().length} / 20 chars</span>
              <span>{reason.trim().length >= 20 ? '✓ Requirement met' : 'Min 20 required'}</span>
            </div>
            <button
              disabled={busy || reason.trim().length < 20}
              onClick={() =>
                act(async () => {
                  const c = await demoStore.revealContact(review.id, reason);
                  setRevealed(
                    `Subject ID: ${c.subjectId} · Emergency Contact: ${c.emergencyContact} (${c.emergencyPhone})`,
                  );
                  setRevealOpen(false);
                }, 'Decryption logged in audit ledger.')
              }
              className="w-full rounded-full bg-sand-900 py-3 text-xs font-semibold uppercase tracking-wider text-sand-50 shadow hover:bg-sand-800 disabled:opacity-40 transition-all"
            >
              Decrypt & Audit Write
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
