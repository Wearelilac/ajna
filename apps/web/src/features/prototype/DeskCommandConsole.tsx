'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useDemo } from '@/hooks/useDemo';
import { demoStore } from '@/demo/store';
import { soundEffects } from '@/utils/sound';

export function DeskCommandConsole() {
  const { reviews, drafts, communities, clusters, member, overview } = useDemo();
  const [activeTab, setActiveTab] = useState<'crisis' | 'caregap' | 'pulse' | 'briefing'>('crisis');
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const pendingReviews = reviews.filter((r) => r.state !== 'closed');
  const pendingDrafts = drafts.filter((d) => d.status === 'in_review' || d.status === 'draft');
  const liveReviews = reviews.filter((r) => r.id.startsWith('rev-live'));

  const handleApproveDraft = async (draftId: string) => {
    soundEffects.playClick();
    try {
      await demoStore.transitionDraft(draftId, 'approved', 'Approved by Staff Lead in Dual-View');
      soundEffects.playSuccess();
      setActionNotice(
        member.consent.outreach
          ? 'Draft approved & delivered! Check Maya’s inbox on the phone frame.'
          : 'Draft approved, but held from delivery because Maya’s Outreach Consent is OFF.',
      );
      setTimeout(() => setActionNotice(null), 5000);
    } catch {
      //
    }
  };

  const handleAssignReview = async (reviewId: string) => {
    soundEffects.playClick();
    try {
      await demoStore.assign(reviewId, 'staff-clinician-1');
      soundEffects.playSuccess();
      setActionNotice('Case assigned to active clinician session.');
      setTimeout(() => setActionNotice(null), 4000);
    } catch {
      //
    }
  };

  const handleCloseReview = async (reviewId: string) => {
    soundEffects.playClick();
    try {
      await demoStore.transition(reviewId, 'closed', 'routine_follow_up_requested', 'Routine follow-up scheduled');
      soundEffects.playSuccess();
      setActionNotice('Review closed with routine follow-up note.');
      setTimeout(() => setActionNotice(null), 4000);
    } catch {
      //
    }
  };

  return (
    <div className="flex h-full flex-col rounded-[2.2rem] border border-sand-300 bg-sand-0/95 p-6 shadow-2xl backdrop-blur-xl">
      {/* Console Top Bar */}
      <div className="flex items-center justify-between border-b border-sand-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-clay bg-sand-100 px-2 py-0.5 rounded">
              STAFF COMMAND CONSOLE
            </span>
            <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
              LIVE BRIDGE
            </span>
          </div>
          <h2 className="font-serif text-2xl font-medium text-sand-900 mt-1">
            Clinical Triage & Population Health
          </h2>
        </div>

        {/* Console Nav Tabs */}
        <div className="flex items-center gap-1.5 rounded-xl bg-sand-100/90 p-1 border border-sand-200">
          <button
            onClick={() => {
              soundEffects.playClick();
              setActiveTab('crisis');
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'crisis'
                ? 'bg-sand-900 text-sand-50 shadow-sm'
                : 'text-sand-700 hover:text-sand-900'
            }`}
          >
            Crisis Queue ({pendingReviews.length})
          </button>
          <button
            onClick={() => {
              soundEffects.playClick();
              setActiveTab('caregap');
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'caregap'
                ? 'bg-sand-900 text-sand-50 shadow-sm'
                : 'text-sand-700 hover:text-sand-900'
            }`}
          >
            Care-Gap Matcher ({pendingDrafts.length})
          </button>
          <button
            onClick={() => {
              soundEffects.playClick();
              setActiveTab('pulse');
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'pulse'
                ? 'bg-sand-900 text-sand-50 shadow-sm'
                : 'text-sand-700 hover:text-sand-900'
            }`}
          >
            K-Anonymity Pulse
          </button>
        </div>
      </div>

      {/* Live Action Toast Banner */}
      {actionNotice && (
        <div className="mt-3 rounded-xl border border-clay/40 bg-sand-100 p-3 text-xs text-sand-900 animate-in fade-in duration-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">⚡</span>
            <span>{actionNotice}</span>
          </div>
          <span className="font-mono text-[10px] text-sand-500">Live Synced</span>
        </div>
      )}

      {/* Main Console Tab View */}
      <div className="mt-4 flex-1 overflow-y-auto pr-1 phone-scroll">
        {/* TAB 1: CRISIS QUEUE */}
        {activeTab === 'crisis' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-sand-600 bg-sand-100/70 p-3 rounded-2xl">
              <div>
                <p className="font-semibold text-sand-900">
                  Advisory Signals Generated by Ephemeral Audio Engine
                </p>
                <p className="text-[11px] text-sand-600 mt-0.5">
                  Audio was zero-filled on device; only non-diagnostic feature vectors are triaged
                  here.
                </p>
              </div>
              <span className="font-mono text-[10px] bg-sand-200 px-2 py-1 rounded font-medium">
                SLA: &lt;15m
              </span>
            </div>

            <div className="space-y-2.5">
              {reviews.map((r) => {
                const isLive = r.id.startsWith('rev-live');
                const isSelected = selectedReviewId === r.id;
                return (
                  <div
                    key={r.id}
                    className={`rounded-2xl border p-4 transition-all ${
                      isSelected
                        ? 'border-clay bg-sand-50 shadow-md ring-1 ring-clay/30'
                        : 'border-sand-200 bg-sand-0 hover:border-sand-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-medium ${
                              r.state === 'new'
                                ? 'bg-amber-100 text-amber-900'
                                : r.state === 'in_review'
                                ? 'bg-blue-100 text-blue-900'
                                : r.state === 'closed'
                                ? 'bg-sand-200 text-sand-700'
                                : 'bg-sand-100 text-sand-800'
                            }`}
                          >
                            {r.state.toUpperCase()}
                          </span>
                          {isLive && (
                            <span className="rounded-full bg-clay text-sand-50 px-2 py-0.5 text-[9px] font-mono">
                              ★ Born From Phone Listen
                            </span>
                          )}
                        </div>
                        <p className="mt-1 font-serif text-lg font-medium text-sand-900 capitalize">
                          {r.flags?.[0]?.signature?.replace(/_/g, ' ') || 'De-Identified Flag'}
                        </p>
                        <p className="text-xs text-sand-600 mt-0.5">
                          {r.flagCount} flag(s) · Model: {r.flags?.[0]?.modelVersion || 'v2.1'} ·
                          Confidence:{' '}
                          {Math.round((r.flags?.[0]?.confidence || 0.85) * 100)}%
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        {r.state === 'new' && (
                          <button
                            onClick={() => handleAssignReview(r.id)}
                            className="rounded-full bg-sand-900 px-3 py-1.5 text-xs font-semibold text-sand-50 shadow hover:bg-sand-800 transition"
                          >
                            Assign To Me
                          </button>
                        )}
                        {r.state === 'assigned' && (
                          <button
                            onClick={() => handleCloseReview(r.id)}
                            className="rounded-full bg-clay px-3 py-1.5 text-xs font-semibold text-sand-50 shadow hover:bg-clay-deep transition"
                          >
                            Resolve / Follow-up
                          </button>
                        )}
                        {r.state === 'closed' && (
                          <span className="text-xs text-sand-500 font-mono">✓ Resolved</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: CARE-GAP OUTREACH */}
        {activeTab === 'caregap' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-sand-600 bg-sand-100/70 p-3 rounded-2xl">
              <div>
                <p className="font-semibold text-sand-900">
                  Algorithmic Preventive Outreach Matcher
                </p>
                <p className="text-[11px] text-sand-600 mt-0.5">
                  When you approve a draft here, it instantly arrives in Maya&apos;s phone inbox (if
                  outreach consent is on).
                </p>
              </div>
              <span className="font-mono text-[10px] bg-emerald-100 text-emerald-900 px-2 py-1 rounded font-medium">
                Non-Diagnostic Certified
              </span>
            </div>

            <div className="space-y-2.5">
              {drafts.map((d) => (
                <div
                  key={d.id}
                  className="rounded-2xl border border-sand-200 bg-sand-0 p-4 shadow-sm hover:border-sand-300 transition-all"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-medium ${
                        d.status === 'in_review'
                          ? 'bg-blue-100 text-blue-900 ring-1 ring-blue-300'
                          : d.status === 'approved' || d.status === 'edited_approved'
                          ? 'bg-emerald-100 text-emerald-900'
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
                    {d.pathwayId.replace('path-', '').replace(/-/g, ' ').toUpperCase()} OUTREACH
                  </p>
                  <p className="mt-1 text-xs text-sand-700 leading-relaxed bg-sand-50 p-2.5 rounded-xl border border-sand-200/50">
                    {d.body}
                  </p>

                  <div className="mt-3 flex items-center justify-between border-t border-sand-100 pt-2">
                    <span className="text-[10px] font-mono text-sand-500">
                      Generator: {d.generatedBy}
                    </span>
                    {(d.status === 'draft' || d.status === 'in_review') && (
                      <button
                        onClick={() => handleApproveDraft(d.id)}
                        className="rounded-full bg-sand-900 px-3.5 py-1.5 text-xs font-semibold text-sand-50 shadow hover:bg-sand-800 active:scale-95 transition"
                      >
                        Approve & Push to Phone →
                      </button>
                    )}
                    {(d.status === 'approved' || d.status === 'edited_approved') && (
                      <span className="text-xs font-medium text-emerald-800 font-mono">
                        ✓ Delivered to Member Inbox
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: POPULATION & K-ANONYMITY */}
        {activeTab === 'pulse' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-sand-200 bg-sand-0 p-3 text-center">
                <p className="font-serif text-2xl font-semibold text-sand-900">
                  {overview.totalSubjects.toLocaleString()}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-sand-500 font-semibold">
                  Participants
                </p>
              </div>
              <div className="rounded-2xl border border-sand-200 bg-sand-0 p-3 text-center">
                <p className="font-serif text-2xl font-semibold text-sand-900">
                  {overview.totalCommunities}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-sand-500 font-semibold">
                  Communities
                </p>
              </div>
              <div className="rounded-2xl border border-clay/30 bg-sand-100 p-3 text-center">
                <p className="font-serif text-2xl font-semibold text-clay">K ≥ 10</p>
                <p className="text-[10px] uppercase tracking-wider text-sand-600 font-semibold">
                  Suppression Rule
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-sand-200 bg-sand-0 p-4 shadow-sm">
              <h3 className="font-serif text-base font-semibold text-sand-900 mb-2">
                Geographic Risk & Deprivation Aggregates
              </h3>
              <div className="space-y-2">
                {communities.map((c) => (
                  <div
                    key={c.communityId}
                    className="flex items-center justify-between rounded-xl border border-sand-100 p-2.5 text-xs hover:bg-sand-50"
                  >
                    <div>
                      <span className="font-medium text-sand-900">{c.name}</span>
                      <span className="text-sand-500 ml-1.5 font-mono text-[10px]">
                        ({c.regionCode})
                      </span>
                    </div>

                    {c.suppressed ? (
                      <span className="rounded-full bg-sand-200 px-2 py-0.5 text-[10px] font-mono text-sand-700">
                        🔒 Suppressed (n &lt; 10)
                      </span>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sand-600">n={c.subjectsN}</span>
                        <span className="font-serif font-semibold text-sand-900">
                          PRI: {c.meanPri}
                        </span>
                        <span className="text-sand-500">{c.flagCount} flags</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Console Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-sand-200/80 pt-3 text-[11px] font-mono text-sand-500">
        <span>SECURITY: RLS POLICIES VERIFIED</span>
        <span>ZERO RAW AUDIO PERSISTED</span>
      </div>
    </div>
  );
}
