/**
 * W3.1: State History Component
 * Shows audit trail from crisis_review_events
 */

'use client';

import React, { useEffect, useState } from 'react';
import { CrisisReviewEvent } from '../types';
import { crisisReviewsApi } from '../api';

interface StateHistoryProps {
  reviewId: string;
}

export function StateHistory({ reviewId }: StateHistoryProps) {
  const [events, setEvents] = useState<CrisisReviewEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    crisisReviewsApi.events(reviewId).then((data) => {
      if (!cancelled) setEvents(data);
    });
    return () => {
      cancelled = true;
    };
  }, [reviewId]);

  if (events.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">State History</h2>

      <div className="space-y-3">
        {events.map((event) => (
          <div key={event.id} className="flex items-start space-x-3">
            <div className="flex-shrink-0 h-2 w-2 mt-2 rounded-full bg-blue-600" />
            <div>
              <div className="text-sm text-gray-900">
                {event.fromState} → {event.toState}
              </div>
              <div className="text-xs text-gray-500">
                {new Date(event.at).toLocaleString()} by {event.actorId}
              </div>
              {event.reason && (
                <div className="text-sm text-gray-600 mt-1">{event.reason}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
