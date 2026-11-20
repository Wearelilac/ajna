'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useDemo } from '@/hooks/useDemo';
import { Chip, Outcome, Sheet } from './ui';
import type { Community, Cluster } from '@/features/population/types';
import { soundEffects } from '@/utils/sound';

export function PopulationScreen() {
  const { communities, clusters, member, overview } = useDemo();
  const [region, setRegion] = useState('all');
  const [picked, setPicked] = useState<Community | null>(null);
  const [cluster, setCluster] = useState<Cluster | null>(null);

  const regions = useMemo(
    () => ['all', ...Array.from(new Set(communities.map((c) => c.regionCode)))],
    [communities],
  );
  const list = communities.filter((c) => (region === 'all' ? true : c.regionCode === region));
  const suppressedCount = communities.filter((c) => c.suppressed).length;

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
          K-Anonymity (K≥10)
        </p>
        <h1 className="font-serif text-3xl font-medium text-sand-900">Community Pulse</h1>
        <p className="text-xs text-sand-600 mt-1">
          {overview.totalSubjects.toLocaleString()} participants across {overview.totalCommunities}{' '}
          neighborhoods. Public health officials see only small-cell suppressed aggregates.
        </p>
      </div>

      {!member.consent.population && (
        <Outcome
          tone="shield"
          kicker="Consent Enforced"
          title="Maya Excluded from Rollups"
          body="Population consent is toggled off. Even within K≥10 aggregates, Maya's biometrics are cryptographically excluded from the weekly aggregation."
        />
      )}

      {/* Aggregate Stat Indicators */}
      <div className="grid grid-cols-3 gap-2">
        <Stat n={overview.avgPri} l="Avg PRI" sub="30-day band" />
        <Stat n={overview.totalFlags} l="Total Flags" sub="Advisory" />
        <Stat
          n={suppressedCount}
          l="Suppressed"
          sub="K<10 cells"
          highlight={suppressedCount > 0}
        />
      </div>

      {/* Region Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {regions.map((r) => (
          <Chip key={r} active={region === r} onClick={() => setRegion(r)}>
            {r === 'all' ? 'All Regions' : `Region ${r}`}
          </Chip>
        ))}
      </div>

      {/* Community List */}
      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-sand-500">
          Neighborhood Aggregates (Tap to verify K-Anonymity)
        </p>

        <ul className="space-y-2">
          {list.map((c) => (
            <li key={c.communityId}>
              <button
                onClick={() => {
                  soundEffects.playClick();
                  setPicked(c);
                }}
                className={`w-full rounded-2xl border p-3.5 text-left shadow-sm transition-all active:scale-[0.99] ${
                  c.suppressed
                    ? 'border-sand-300 bg-sand-100/50 hover:bg-sand-200/50'
                    : 'border-sand-200 bg-sand-0 hover:border-sand-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-serif text-base font-semibold text-sand-900">{c.name}</p>
                  <span className="font-mono text-[10px] text-sand-500 bg-sand-100 px-2 py-0.5 rounded">
                    {c.regionCode}
                  </span>
                </div>

                {c.suppressed ? (
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-clay font-medium">
                    <span>🔒 Protected: Small-Cell Suppressed (n &lt; 10)</span>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center justify-between text-xs text-sand-600">
                    <span>Cohort: {c.subjectsN} subjects</span>
                    <span className="font-medium text-sand-900">Mean PRI: {c.meanPri}</span>
                    <span>{c.flagCount} flags</span>
                  </div>
                )}

                {/* Deprivation Index Bar */}
                <div className="mt-2.5">
                  <div className="flex justify-between text-[10px] text-sand-500 font-mono mb-1">
                    <span>Area Deprivation Index</span>
                    <span>{(c.deprivationIndex * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-sand-200">
                    <div
                      className="h-full bg-clay"
                      style={{ width: `${Math.round(c.deprivationIndex * 100)}%` }}
                    />
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Underserved Clusters */}
      <section className="pt-2">
        <h2 className="font-serif text-xl font-medium text-sand-900 mb-2">
          Vector Similarity Clusters (pgvector)
        </h2>
        <p className="text-xs text-sand-600 mb-2">
          Clusters group communities with correlated deprivation and missed screening rates for
          public health resource allocation.
        </p>
        <ul className="space-y-2">
          {clusters.map((cl) => (
            <li key={cl.clusterId}>
              <button
                onClick={() => {
                  soundEffects.playClick();
                  setCluster(cl);
                }}
                className="w-full rounded-2xl border border-sand-200 bg-sand-0 p-3.5 text-left shadow-sm hover:border-sand-300 transition-all active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm text-sand-900">{cl.label}</p>
                  <span className="font-mono text-xs font-semibold text-clay">
                    Score: {cl.score}
                  </span>
                </div>
                <p className="mt-1 text-xs text-sand-600">
                  {cl.communities.length} communities · Priority care-gap pathway targets
                </p>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Community Detail Sheet */}
      {picked && (
        <Sheet
          title={picked.name}
          subtitle={`Community ID: ${picked.communityId} · Region ${picked.regionCode}`}
          onClose={() => setPicked(null)}
        >
          <div className="space-y-3 pt-2">
            {picked.suppressed ? (
              <Outcome
                tone="shield"
                kicker="Cryptographic K-Anonymity Suppression"
                title="Cell Data Strictly Hidden"
                body={`Only ${picked.subjectsN} active participants reside in this community (threshold K=10). To prevent re-identification through small-cell triangulation, all metrics, flags, and PRI aggregates are masked by law.`}
              />
            ) : (
              <div className="space-y-3">
                <Outcome
                  tone="neutral"
                  kicker="Cohort Aggregate (n≥10)"
                  title={`Mean Cohort Resilience: ${picked.meanPri}`}
                  body={`${picked.flagCount} advisory deviation flags reported this week. Area deprivation score: ${picked.deprivationIndex.toFixed(
                    2,
                  )}. No individual identifiable records are queryable.`}
                />
                {picked.communityId === member.communityId && (
                  <div className="rounded-2xl border border-clay/30 bg-sand-100 p-3.5 text-xs text-sand-800">
                    <p className="font-semibold text-sand-900 mb-1">Local Member Participation:</p>
                    Maya lives in this community. Per privacy design, she is completely unlisted as an
                    individual. Her participation status is currently:{' '}
                    <strong>{member.consent.population ? 'Active (Aggregated)' : 'Withheld by Consent'}</strong>.
                  </div>
                )}
              </div>
            )}
          </div>
        </Sheet>
      )}

      {/* Cluster Detail Sheet */}
      {cluster && (
        <Sheet
          title={`Cluster: ${cluster.label}`}
          subtitle={`Deprivation Vector Score: ${cluster.score}`}
          onClose={() => setCluster(null)}
        >
          <div className="space-y-3 pt-2">
            <Outcome
              tone="neutral"
              kicker="Algorithmic Matcher Target"
              title="Prioritized for Human-Approved Care-Gaps"
              body="Communities in this cluster exhibit elevated blood pressure and well-child visit gaps. Automated matchers draft suggested outreach, waiting on human clinical approval."
            />
            <div className="rounded-2xl bg-sand-100 p-3 text-xs space-y-1.5 font-mono">
              <p className="font-sans font-semibold text-sand-900 mb-1">Vector Dimensions:</p>
              {Object.entries(cluster.scoreBreakdown).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="capitalize">{k.replace(/_/g, ' ')}</span>
                  <span className="font-bold">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function Stat({
  n,
  l,
  sub,
  highlight,
}: {
  n: number;
  l: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 text-center shadow-sm ${
        highlight
          ? 'border-clay/40 bg-sand-100'
          : 'border-sand-200 bg-sand-0'
      }`}
    >
      <p className="font-serif text-2xl font-semibold text-sand-900">{n}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-sand-600 mt-0.5">{l}</p>
      <p className="text-[9px] text-sand-400 font-mono">{sub}</p>
    </div>
  );
}
