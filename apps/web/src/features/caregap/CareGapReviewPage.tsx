/**
 * W4.2: Care-Gap Review Console
 * /caregap-review route - Outreach draft review workflow
 * State machine: draft → in_review → approved | edited_approved | rejected → closed
 */

'use client';

import React, { useState } from 'react';
import { useCareGapData } from './hooks/useCareGapData';
import { DraftQueueTable } from './components/DraftQueueTable';
import { DraftDetailModal } from './components/DraftDetailModal';
import { DraftFilters } from './components/DraftFilters';
import { ReviewNotice } from './components/ReviewNotice';

export function CareGapReviewPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);

  const { drafts, isLoading, error, refetch } = useCareGapData({
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  const selectedDraft = drafts.find((d) => d.id === selectedDraftId);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Care-Gap Review Console</h1>
          <p className="text-gray-600 mt-2">
            Review and approve outreach drafts before delivery
          </p>
        </div>

        <ReviewNotice />

        <DraftFilters statusFilter={statusFilter} onStatusChange={setStatusFilter} />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        ) : (
          <DraftQueueTable
            drafts={drafts}
            onSelectDraft={(id) => setSelectedDraftId(id)}
          />
        )}

        {selectedDraft && (
          <DraftDetailModal
            draft={selectedDraft}
            onClose={() => setSelectedDraftId(null)}
            onUpdate={refetch}
          />
        )}

        <div className="mt-4 text-sm text-gray-500">
          Last updated: {new Date().toLocaleTimeString()}
          <button
            onClick={() => refetch()}
            className="ml-4 text-blue-600 hover:text-blue-800"
          >
            Refresh now
          </button>
        </div>
      </div>
    </div>
  );
}
