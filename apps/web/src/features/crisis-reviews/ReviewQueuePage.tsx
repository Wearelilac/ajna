/**
 * W3.1: Crisis Review Queue Page
 * /review route - Table of crisis review items
 * Filters: state, owner, escalatedToLead
 * Auto-refresh every 30 seconds
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCrisisReviews } from './hooks/useCrisisReviews';
import { CrisisReviewState, CrisisOutcome } from './types';
import { ReviewQueueTable } from './components/ReviewQueueTable';
import { ReviewFilters } from './components/ReviewFilters';
import { SafetyNotice } from './components/SafetyNotice';

export function ReviewQueuePage() {
  const [stateFilter, setStateFilter] = useState<CrisisReviewState | 'all'>('all');
  const [ownerFilter, setOwnerFilter] = useState<'me' | 'unassigned' | 'all'>('all');
  const [escalatedOnly, setEscalatedOnly] = useState(false);

  const {
    reviews,
    isLoading,
    error,
    refetch,
  } = useCrisisReviews({
    state: stateFilter === 'all' ? undefined : stateFilter,
    ownerId: ownerFilter === 'me' ? 'current-user-id' : undefined, // TODO: Get from auth
    escalatedToLead: escalatedOnly ? 'true' : undefined,
  });

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      refetch();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [refetch]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Crisis Review Queue</h1>
          <p className="text-gray-600 mt-2">
            Human review workflow for flagged advisory signals
          </p>
        </div>

        <SafetyNotice />

        <ReviewFilters
          stateFilter={stateFilter}
          ownerFilter={ownerFilter}
          escalatedOnly={escalatedOnly}
          onStateChange={setStateFilter}
          onOwnerChange={setOwnerFilter}
          onEscalatedChange={setEscalatedOnly}
        />

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
          <ReviewQueueTable reviews={reviews} />
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
