'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useDemo } from '@/hooks/useDemo';
import { demoStore } from '@/demo/store';
import { SCENARIO_COPY, type ScenarioId } from '@/demo/member';
import { Chip, Outcome, PriRing, Sheet, Spark } from './ui';
import { soundEffects } from '@/utils/sound';

const SCENARIOS: { id: ScenarioId; icon: string }[] = [
  { id: 'steady', icon: '🌿' },
  { id: 'gradual_decline', icon: '📉' },
  { id: 'acute_deviation', icon: '⚡' },
  { id: 'night_watch', icon: '🌙' },
];

export function TodayScreen() {
  const { member, reviews, drafts } = useDemo();
  const [rest, setRest] = useState(7);
  const [load, setLoad] = useState(5);
  const [mood, setMood] = useState(7);
  const [checkOutcome, setCheckOutcome] = useState<string | null>(null);
  const [openMail, setOpenMail] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => demoStore.tick(), 4000);
    return () => clearInterval(id);
  }, []);

  const openReviews = reviews.filter((r) => r.state !== 'closed').length;
  const pendingDrafts = drafts.filter(
    (d) => d.status === 'draft' || d.status === 'in_review',
  ).length;
  const mail = member.inbox.find((i) => i.id === openMail);

  return (
    <div className="space-y-4 pb-4">
      {/* Member Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-sand-500 font-semibold">
            Member Resilience
          </p>
          <h1 className="font-serif text-3xl font-medium text-sand-900">{member.name}</h1>
          <p className="text-xs text-sand-600 mt-0.5">
            {member.communityName} · Non-Identifiable Profile
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-sand-200/90 px-2.5 py-1 text-[11px] font-medium text-sand-800">
          <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
          <span>Live Sync</span>
        </div>
      </div>

      {/* Primary PRI Ring Gauge */}
      <div className="py-1">
        <PriRing value={member.pri} />
        <p className="mt-2 text-center text-[11px] text-sand-600">
          Versus personal 30-day baseline. Strictly advisory, never a diagnosis.
        </p>
      </div>

      {/* 14-Day Trajectory Spark */}
      <div className="rounded-2xl border border-sand-200 bg-sand-50 p-3 shadow-sm">
        <div className="flex items-center justify-between text-xs text-sand-600 mb-2">
          <span className="font-medium text-sand-800">14-Day Resilience Sparkline</span>
          <span className="font-mono text-[10px]">Rolling Mean: {member.pri}</span>
        </div>
        <Spark values={member.priHistory} height={44} />
      </div>

      {/* Scenario Presets Switcher */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-sand-500">
            Active Clinical Scenario
          </p>
          <span className="text-[10px] text-sand-500 font-mono">Simulated Member State</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {SCENARIOS.map(({ id, icon }) => (
            <button
              key={id}
              onClick={() => {
                soundEffects.playClick();
                demoStore.setScenario(id);
              }}
              className={`flex items-center gap-2 rounded-2xl p-2.5 text-left text-xs transition-all active:scale-[0.98] ${
                member.scenario === id
                  ? 'border border-clay bg-sand-900 text-sand-50 shadow-sm'
                  : 'border border-sand-200 bg-sand-0 text-sand-800 hover:bg-sand-100/80'
              }`}
            >
              <span className="text-base">{icon}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{SCENARIO_COPY[id].title}</p>
                <p
                  className={`text-[10px] truncate ${
                    member.scenario === id ? 'text-sand-300' : 'text-sand-500'
                  }`}
                >
                  {id === 'steady'
                    ? 'Normal baseline'
                    : id === 'gradual_decline'
                    ? 'Subtle HRV drift'
                    : id === 'acute_deviation'
                    ? 'Acute spike'
                    : 'Nocturnal watch'}
                </p>
              </div>
            </button>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-sand-600 bg-sand-100/70 p-2.5 rounded-xl border border-sand-200/60">
          {SCENARIO_COPY[member.scenario].blurb}
        </p>
      </div>

      {/* Staff Review Desk Quick Badges */}
      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/app/desk"
          onClick={() => soundEffects.playClick()}
          className="group rounded-2xl border border-sand-200 bg-sand-100/80 p-3 hover:bg-sand-200/70 transition-all active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-sand-500">
              Staff Desk
            </span>
            <span className="h-2 w-2 rounded-full bg-clay group-hover:scale-125 transition-transform" />
          </div>
          <p className="font-serif text-2xl font-semibold text-sand-900 mt-0.5">{openReviews}</p>
          <p className="text-xs text-sand-600">Pending human review</p>
        </Link>

        <Link
          href="/app/desk/caregap"
          onClick={() => soundEffects.playClick()}
          className="group rounded-2xl border border-sand-200 bg-sand-100/80 p-3 hover:bg-sand-200/70 transition-all active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-sand-500">
              Outreach Gaps
            </span>
            <span className="h-2 w-2 rounded-full bg-sand-600 group-hover:scale-125 transition-transform" />
          </div>
          <p className="font-serif text-2xl font-semibold text-sand-900 mt-0.5">{pendingDrafts}</p>
          <p className="text-xs text-sand-600">Drafts awaiting approval</p>
        </Link>
      </div>

      {/* Daily Check-In */}
      <section className="rounded-2xl border border-sand-200 bg-sand-0 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-serif text-lg font-medium text-sand-900">Subjective Check-In</h2>
          <span className="text-[10px] font-mono text-sand-500">Calibrates PRI</span>
        </div>
        <Slider label="Restorative Sleep Quality" value={rest} onChange={setRest} />
        <Slider label="Cognitive & Physical Load" value={load} onChange={setLoad} />
        <Slider label="Emotional Valence / Mood" value={mood} onChange={setMood} />

        <button
          className="mt-3 w-full rounded-full bg-sand-900 py-2.5 text-xs font-semibold uppercase tracking-wider text-sand-50 shadow hover:bg-sand-800 active:scale-95 transition-all"
          onClick={() => {
            soundEffects.playPulse();
            const row = demoStore.recordCheckIn({ rest, load, mood });
            setCheckOutcome(row.note);
            soundEffects.playSuccess();
          }}
        >
          Submit Today&apos;s Entry
        </button>

        {checkOutcome && (
          <div className="mt-3 animate-in fade-in duration-300">
            <Outcome
              tone="success"
              kicker="Check-In Recalibrated"
              title={`Personal Resilience Index is now ${member.pri}`}
              body={checkOutcome}
            />
          </div>
        )}
      </section>

      {/* Member Inbox */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-serif text-lg font-medium text-sand-900">Member Inbox</h2>
          <span className="rounded-full bg-sand-200 px-2 py-0.5 text-xs font-medium text-sand-700">
            {member.inbox.length} {member.inbox.length === 1 ? 'message' : 'messages'}
          </span>
        </div>

        {member.inbox.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-sand-300 bg-sand-100/50 p-4 text-center">
            <p className="text-xs font-medium text-sand-700">No Outreach Received Yet</p>
            <p className="mt-1 text-[11px] text-sand-500 leading-relaxed">
              Ajna requires 100% human gating. Switch to the <strong>Staff Desk</strong> to approve
              a care-gap outreach or complete a crisis review.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {member.inbox.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => {
                    soundEffects.playClick();
                    demoStore.markInboxRead(item.id);
                    setOpenMail(item.id);
                  }}
                  className="w-full rounded-2xl border border-sand-200 bg-sand-0 p-3.5 text-left shadow-sm hover:border-sand-300 transition-all active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-sand-900">{item.title}</p>
                    <span className="rounded-full bg-sand-100 px-2 py-0.5 text-[10px] font-mono text-sand-600">
                      {item.pathway}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-sand-600 leading-relaxed">
                    {item.body}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-clay font-medium">
                    <span>✓ Human-Approved Delivery</span>
                    <span>·</span>
                    <span>Consent Active</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Live Journal */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-serif text-lg font-medium text-sand-900">Resilience Audit Journal</h2>
          <span className="text-xs text-sand-500 font-mono">Immutable</span>
        </div>
        <ul className="space-y-2">
          {member.journal.slice(0, 5).map((j) => (
            <li
              key={j.id}
              className="rounded-2xl border border-sand-200 bg-sand-0 p-3 text-xs shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold uppercase tracking-wider text-[10px] text-clay">
                  {j.kind}
                </span>
                <span className="text-[10px] text-sand-500 font-mono">
                  {new Date(j.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="mt-1 font-medium text-sand-900">{j.title}</p>
              <p className="mt-0.5 text-sand-600 leading-relaxed">{j.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Message Sheet Drawer */}
      {mail && (
        <Sheet
          title={mail.title}
          subtitle={`Human Gated · ${mail.pathway}`}
          onClose={() => setOpenMail(null)}
        >
          <div className="space-y-3 pt-2">
            <Outcome
              tone="shield"
              kicker="Privacy Guarantee Enforced"
              title="Verified Human-Approved Outreach"
              body="This message was drafted by the care-gap matcher algorithm and strictly reviewed by an authorized human clinical coordinator before delivery. No automatic outbound SMS or robocalls."
            />
            <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4 text-sm leading-relaxed text-sand-900 whitespace-pre-wrap">
              {mail.body}
            </div>
            <p className="text-[11px] text-sand-500 italic">
              Recipient: Maya ({member.communityName}) · Outreach Consent: Enabled
            </p>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="mt-2.5 block text-xs font-medium text-sand-700">
      <div className="flex items-center justify-between mb-1">
        <span>{label}</span>
        <span className="font-serif font-semibold text-sand-900 bg-sand-100 px-2 py-0.5 rounded text-xs">
          {value} / 10
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => {
          soundEffects.playClick();
          onChange(Number(e.target.value));
        }}
        className="w-full h-1.5 bg-sand-200 rounded-lg appearance-none cursor-pointer accent-clay"
      />
    </label>
  );
}
