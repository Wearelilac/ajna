'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useDemo } from '@/hooks/useDemo';
import { GaussianBaselineChart, Outcome, Sheet, Spark } from './ui';
import type { WearableMetric } from '@/demo/member';
import { soundEffects } from '@/utils/sound';

export function RadarScreen() {
  const { member } = useDemo();
  const [metric, setMetric] = useState<WearableMetric | null>(null);
  const [flagId, setFlagId] = useState<string | null>(null);
  const flag = member.deviations.find((d) => d.id === flagId);

  if (!member.consent.wearable) {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-sand-500 font-semibold">
            Privacy Vault Barrier
          </p>
          <h1 className="font-serif text-3xl text-sand-900">Radar is Gated</h1>
        </div>
        <Outcome
          tone="shield"
          kicker="Consent Gate"
          title="Wearable baseline ingestion is disabled"
          body="No PRI calculation, confidence intervals, or personal deviation cards are requested until you re-enable Wearable Baselines in your Consent Vault."
        />
        <Link
          href="/app/privacy"
          className="block w-full rounded-full bg-sand-900 py-3 text-center text-sm font-medium text-sand-50 shadow hover:bg-sand-800 transition-all active:scale-95"
        >
          Open Consent Vault
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-sand-500 font-semibold">
          30-Day Baselines
        </p>
        <h1 className="font-serif text-3xl text-sand-900">Today vs. Your Band</h1>
      </div>

      {/* PRI Card with 14-day trajectory */}
      <div className="rounded-3xl border border-sand-200 bg-sand-100/80 p-4 shadow-sm">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-sand-500">
              Personal Resilience Index
            </p>
            <p className="font-serif text-5xl font-medium text-sand-900">{member.pri}</p>
          </div>
          <span className="rounded-full bg-sand-200/90 px-2.5 py-1 text-xs font-medium text-sand-800">
            14-Day Trajectory
          </span>
        </div>
        <div className="mt-4">
          <Spark values={member.priHistory} height={48} />
        </div>
        <p className="mt-2 text-[11px] text-sand-600">
          Gaussian mean against Maya&apos;s past 30 days. Strictly non-diagnostic.
        </p>
      </div>

      {/* Advisory Deviation Flags */}
      {member.deviations.length === 0 ? (
        <Outcome
          tone="success"
          kicker="Baseline Analysis"
          title="All Metrics Within Confidence Band"
          body="All wearable signals reside within ±3 standard deviations of your personal 30-day baseline. No deviations detected."
        />
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-sand-500">
            Advisory Signals ({member.deviations.length})
          </p>
          {member.deviations.map((d) => {
            const m = member.metrics.find((x) => x.id === d.metricId);
            return (
              <button
                key={d.id}
                onClick={() => {
                  soundEffects.playClick();
                  setFlagId(d.id);
                }}
                className="w-full rounded-2xl border border-amber-300/80 bg-amber-50/90 p-3.5 text-left shadow-sm hover:bg-amber-100/90 transition-all active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                    {m?.label} {d.direction} Band
                  </span>
                  <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-mono font-medium text-amber-900">
                    {d.delta}
                  </span>
                </div>
                <p className="mt-1 text-xs text-amber-950/80 line-clamp-2">{d.advisory}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Interactive Metric Cards */}
      <div className="space-y-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-sand-500">
          Wearable Signals (Tap to inspect Gaussian curve)
        </p>

        {member.metrics.map((m) => {
          const range = Math.max(1, m.bandHigh - m.bandLow);
          const pct = Math.min(100, Math.max(0, ((m.value - m.bandLow) / range) * 100));
          const outside = m.value < m.bandLow || m.value > m.bandHigh;

          return (
            <button
              key={m.id}
              onClick={() => {
                soundEffects.playClick();
                setMetric(m);
              }}
              className="group w-full rounded-2xl border border-sand-200 bg-sand-0 p-3.5 text-left shadow-sm hover:border-sand-300 hover:shadow transition-all active:scale-[0.99]"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-sand-900 flex items-center gap-2">
                  {m.label}
                  {m.id === 'hrv' && (
                    <span className="text-[10px] text-clay font-mono">rMSSD</span>
                  )}
                  {m.id === 'resting_hr' && (
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                  )}
                </span>
                <span className="font-serif text-base font-semibold text-sand-900">
                  {m.value}
                  <span className="font-sans text-xs font-normal text-sand-500 ml-0.5">
                    {m.unit}
                  </span>
                </span>
              </div>

              {/* Progress Band */}
              <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-sand-100">
                <div
                  className={`h-full transition-all duration-500 ${
                    outside ? 'bg-clay shadow-sm' : 'bg-sand-500 group-hover:bg-sand-700'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="mt-1.5 flex items-center justify-between text-[10px] text-sand-500 font-mono">
                <span>Personal Band: {m.bandLow}–{m.bandHigh}</span>
                <span>μ: {m.baseline} {m.unit}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Gaussian Distribution Bell Curve Modal */}
      {metric && (
        <Sheet
          title={`${metric.label} Baseline Envelope`}
          subtitle={`Current: ${metric.value} ${metric.unit} (Baseline: ${metric.baseline} ${metric.unit})`}
          onClose={() => setMetric(null)}
        >
          <div className="space-y-4 pt-2">
            <GaussianBaselineChart
              metricLabel={metric.label}
              currentValue={metric.value}
              mean={metric.baseline}
              stdDev={Math.max(1, (metric.bandHigh - metric.bandLow) / 6)}
              unit={metric.unit}
            />

            <Outcome
              tone={
                metric.value < metric.bandLow || metric.value > metric.bandHigh
                  ? 'advisory'
                  : 'success'
              }
              kicker="Statistical Context"
              title={
                metric.value < metric.bandLow || metric.value > metric.bandHigh
                  ? 'Variation Outside Normal Envelope'
                  : 'Observation Inside Normal Variance'
              }
              body={metric.hint}
            />

            <p className="text-xs text-sand-600 leading-relaxed">
              Ajna computes baselines using rolling 30-day wear data. Per medical device guidance,
              this is an <em>advisory indicator</em> solely for self-reflection and care-gap routing.
              It is never an automated clinical diagnosis.
            </p>
          </div>
        </Sheet>
      )}

      {/* Advisory Flag Sheet */}
      {flag && (
        <Sheet
          title="Advisory Deviation Note"
          subtitle={flag.delta}
          onClose={() => setFlagId(null)}
        >
          <div className="space-y-3 pt-2">
            <Outcome
              tone="advisory"
              kicker="Advisory Threshold Exceeded"
              title="Flagged for Routine Human Review"
              body={flag.advisory}
            />
            <p className="text-xs text-sand-700 leading-relaxed">
              When a metric deviates significantly (&gt;3 SDs), a non-urgent flag is logged in Maya&apos;s
              de-identified journal. No outreach or alerts are dispatched without human confirmation.
            </p>
          </div>
        </Sheet>
      )}
    </div>
  );
}
