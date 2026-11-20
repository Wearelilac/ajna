'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useDemo } from '@/hooks/useDemo';
import { demoStore } from '@/demo/store';
import type { OutreachDraft } from '@/features/caregap/types';
import { Chip, Outcome, Sheet } from './ui';
import { soundEffects } from '@/utils/sound';

const STATUSES = ['all', 'draft', 'in_review', 'approved', 'rejected', 'closed'];

const PATHWAYS: Record<string, { title: string; why: string }> = {
  'path-well-child': {
    title: 'Well-Child Visit Reminder',
    why: 'Community pathway ranked this gap first after pediatric immunization lag was identified in Bayview.',
  },
  'path-bp-screen': {
    title: 'Blood Pressure Health Screen',
    why: 'Bayview + Eastside cluster analysis indicated elevated cardiovascular deprivation with overdue screenings.',
  },
  'path-mh-screen': {
    title: 'Optional Wellness Check-In',
    why: 'Advisory preventive check-in. Tone strictly eliminates diagnostic clinical terminology.',
  },
  'path-immunization': {
    title: 'Seasonal Immunization Notice',
    why: 'Algorithmic matcher draft. Human reviewers frequently tune tone to maintain friendly community voice.',
  },
};

export function CareGapScreen() {
  const { drafts, member } = useDemo();
  const [status, setStatus] = useState('all');
  const [open, setOpen] = useState<OutreachDraft | null>(null);
  const [body, setBody] = useState('');
  const [reason, setReason] = useState('');
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const list = drafts.filter((d) => (status === 'all' ? true : d.status === status));

  const openDraft = (d: OutreachDraft) => {
    soundEffects.playClick();
    setOpen(d);
    setBody(d.body);
    setReason('');
    setError(null);
  };

  const go = async (to: string, edited?: string) => {
    if (!open) return;
    setError(null);
    try {
      await demoStore.transitionDraft(open.id, to, reason || undefined, edited);
      soundEffects.playSuccess();
      setFlash(
        to === 'approved' || to === 'edited_approved'
          ? member.consent.outreach
            ? 'Approved & Delivered. Maya’s phone inbox received this message in real-time!'
            : 'Approved by Reviewer, but delivery held — Maya’s Outreach Consent is toggled OFF in her vault.'
          : to === 'rejected'
          ? 'Draft Rejected. No member contact. Kept as audit record.'
          : `Draft state moved to ${to.replace(/_/g, ' ')}.`,
      );
      setOpen(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transition failed');
    }
  };

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
          Preventive Care-Gap Matcher
        </p>
        <h1 className="font-serif text-3xl font-medium text-sand-900">Outreach Desk</h1>
        <p className="text-xs text-sand-600 mt-1">
          Zero auto-send policy. Every message is drafted by community matchers and requires human
          approval before transmission.
        </p>
      </div>

      {flash && <Outcome tone="success" kicker="Outreach Event" title="Workflow Advanced" body={flash} />}

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
            {s.replace(/_/g, ' ')}
          </Chip>
        ))}
      </div>

      {/* Drafts List */}
      <div className="space-y-2">
        {list.map((d) => (
          <button
            key={d.id}
            onClick={() => openDraft(d)}
            className="w-full rounded-2xl border border-sand-200 bg-sand-0 p-3.5 text-left shadow-sm hover:border-sand-300 transition-all active:scale-[0.99]"
          >
            <div className="flex items-center justify-between text-xs">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-medium ${
                  d.status === 'in_review'
                    ? 'bg-blue-100 text-blue-900 ring-1 ring-blue-300'
                    : d.status === 'approved' || d.status === 'edited_approved'
                    ? 'bg-emerald-100 text-emerald-900'
                    : d.status === 'rejected'
                    ? 'bg-sand-200 text-sand-700'
                    : 'bg-sand-100 text-sand-800'
                }`}
              >
                {d.status.toUpperCase()}
              </span>
              <span className="font-mono text-[10px] text-sand-500">
                Reading Level: {d.readingLevel}
              </span>
            </div>

            <p className="mt-2 font-serif text-base font-semibold text-sand-900">
              {PATHWAYS[d.pathwayId]?.title || d.pathwayId}
            </p>
            <p className="mt-1 line-clamp-2 text-xs text-sand-600 leading-relaxed">{d.body}</p>

            <div className="mt-2.5 flex items-center justify-between text-[10px] text-sand-500 font-mono border-t border-sand-100 pt-2">
              <span>Generator: {d.generatedBy}</span>
              <span className="text-clay font-medium">Click to Review & Gate →</span>
            </div>
          </button>
        ))}
      </div>

      {/* Draft Inspection & Approval Modal */}
      {open && (
        <Sheet
          title={PATHWAYS[open.pathwayId]?.title || 'Care-Gap Outreach'}
          subtitle={`Pathway: ${open.pathwayId} · Status: ${open.status.toUpperCase()}`}
          onClose={() => setOpen(null)}
        >
          <div className="space-y-3 pt-2">
            {/* Compliance Badge */}
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-50/70 p-3 text-xs text-emerald-950 flex items-center justify-between">
              <div>
                <span className="font-semibold block">✓ Non-Diagnostic Language Certified</span>
                <span className="text-[11px] opacity-85">Advisory tone, no diagnosis, warm phrasing</span>
              </div>
              <span className="font-mono text-[10px] bg-emerald-200/80 px-2 py-0.5 rounded font-semibold">
                PASS
              </span>
            </div>

            <p className="text-xs text-sand-600 leading-relaxed bg-sand-100 p-2.5 rounded-xl">
              <strong>Matcher Rationale:</strong> {PATHWAYS[open.pathwayId]?.why}
            </p>

            <label className="block text-xs font-semibold text-sand-700">
              Message Copy (Editable by Reviewer):
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={open.status !== 'draft' && open.status !== 'in_review'}
                className="mt-1.5 h-36 w-full rounded-2xl border border-sand-300 bg-sand-50 p-3 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-clay"
              />
            </label>

            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Clinical reason or review notes (optional)..."
              className="w-full rounded-2xl border border-sand-300 bg-sand-50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-clay"
            />

            {error && <p className="text-xs text-red-700">{error}</p>}

            {/* Approval Workflow Controls */}
            <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-sand-200">
              {open.status === 'draft' && (
                <button
                  onClick={() => go('in_review')}
                  className="rounded-full bg-sand-900 px-4 py-2 text-xs font-semibold text-sand-50 shadow hover:bg-sand-800 transition"
                >
                  Send To Review
                </button>
              )}

              {open.status === 'in_review' && (
                <>
                  <button
                    onClick={() => go('approved')}
                    className="flex-1 rounded-full bg-sand-900 py-2.5 text-xs font-semibold uppercase tracking-wider text-sand-50 shadow hover:bg-sand-800 active:scale-95 transition"
                  >
                    Approve As Is
                  </button>
                  <button
                    onClick={() => go('edited_approved', body)}
                    className="flex-1 rounded-full bg-clay py-2.5 text-xs font-semibold uppercase tracking-wider text-sand-50 shadow hover:bg-clay-deep active:scale-95 transition"
                  >
                    Save Edits & Approve
                  </button>
                  <button
                    onClick={() => go('rejected')}
                    className="rounded-full border border-sand-400 bg-sand-100 px-4 py-2.5 text-xs font-medium text-sand-800 hover:bg-sand-200 transition"
                  >
                    Reject
                  </button>
                </>
              )}

              {(open.status === 'approved' ||
                open.status === 'edited_approved' ||
                open.status === 'rejected') && (
                <button
                  onClick={() => go('closed')}
                  className="w-full rounded-full bg-sand-900 py-2.5 text-xs font-semibold text-sand-50 shadow hover:bg-sand-800 transition"
                >
                  Close Artifact
                </button>
              )}
            </div>
          </div>
        </Sheet>
      )}
    </div>
  );
}
