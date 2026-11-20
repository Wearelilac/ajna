'use client';

import React from 'react';
import Link from 'next/link';
import { useDemo } from '@/hooks/useDemo';
import { soundEffects } from '@/utils/sound';

export function DeskHome() {
  const { reviews, drafts, clusters, member, overview } = useDemo();
  const newest = reviews[0];
  const live = reviews.filter((r) => r.id.startsWith('rev-live'));
  const newReviews = reviews.filter((r) => r.state === 'new').length;
  const pendingDrafts = drafts.filter((d) => d.status === 'in_review' || d.status === 'draft').length;

  const cards = [
    {
      href: '/app/desk/reviews',
      kicker: 'Crisis Queue',
      badge: `${newReviews} new`,
      badgeColor: newReviews > 0 ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-sand-200 text-sand-800',
      title: 'Human Review Console',
      body: `${reviews.length} total items in loop · ${live.length} born from this phone's listen sessions.`,
      icon: '🚨',
    },
    {
      href: '/app/desk/population',
      kicker: 'Community Pulse',
      badge: `${overview.totalCommunities} places`,
      badgeColor: 'bg-sand-200 text-sand-800',
      title: clusters[0]?.label.split('+')[0] || 'Population Clusters',
      body: 'K-anonymous neighborhood cells (K≥10). Tap any suppressed cell to inspect privacy guards.',
      icon: '🌐',
    },
    {
      href: '/app/desk/caregap',
      kicker: 'Care-Gap Outreach',
      badge: `${pendingDrafts} pending`,
      badgeColor: pendingDrafts > 0 ? 'bg-clay/20 text-clay-deep border-clay/40' : 'bg-sand-200 text-sand-800',
      title: 'Human Gated Pathways',
      body: 'Matcher drafts preventive recommendations. Approving one delivers directly to member inbox.',
      icon: '📬',
    },
    {
      href: '/app/desk/briefing',
      kicker: 'Morning Synthesis',
      badge: 'Live',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      title: 'Executive Briefing',
      body: `${member.journal.length} live telemetry beats folded into a structured brief for clinical leads.`,
      icon: '📋',
    },
  ];

  return (
    <div className="space-y-4 pb-4">
      {/* Desk Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-sand-500 font-semibold">
            Clinical Review Desk
          </p>
          <h1 className="font-serif text-3xl font-medium text-sand-900">Same Loop, Other Role</h1>
          <p className="text-xs text-sand-600 mt-0.5">
            Role: Reviewer / Public Health Officer · K-Anonymity Enforced
          </p>
        </div>
        <span className="rounded-full bg-sand-200/90 px-2.5 py-1 text-[11px] font-mono text-sand-800">
          Staff Session
        </span>
      </div>

      {/* Latest Queue Item Callout Banner */}
      {newest && (
        <Link
          href={`/app/desk/reviews/${newest.id}`}
          onClick={() => soundEffects.playClick()}
          className="group block rounded-2xl border border-sand-800 bg-sand-900 p-4 text-sand-50 shadow-md hover:shadow-lg transition-all active:scale-[0.99]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-clay">
              Latest Incoming Flag
            </span>
            <span className="rounded-full bg-sand-800 px-2 py-0.5 text-[10px] font-mono text-sand-200">
              State: {newest.state.toUpperCase()}
            </span>
          </div>
          <p className="mt-1 font-serif text-xl font-medium text-sand-50 group-hover:text-amber-200 transition-colors">
            {newest.flags?.[0]?.signature?.replace(/_/g, ' ') || 'Acoustic Distress Signal'}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-sand-300">
            <span>{newest.flagCount} flag(s) attached · Non-diagnostic signal</span>
            <span className="text-sand-400 font-mono text-[11px]">Inspect →</span>
          </div>
        </Link>
      )}

      {/* Clinical Workspace Cards */}
      <div className="space-y-2.5">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            onClick={() => soundEffects.playClick()}
            className="group block rounded-2xl border border-sand-200 bg-sand-0 p-4 shadow-sm hover:border-sand-300 hover:shadow transition-all active:scale-[0.99]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-sand-500">
                {c.kicker}
              </span>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${c.badgeColor}`}
              >
                {c.badge}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-base">{c.icon}</span>
              <p className="font-serif text-lg font-medium text-sand-900 group-hover:text-clay transition-colors">
                {c.title}
              </p>
            </div>
            <p className="mt-1 text-xs text-sand-600 leading-relaxed">{c.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
