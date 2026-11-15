/**
 * W3.1: Review Queue Filters
 * State, owner, escalation filters
 */

import React from 'react';
import { CrisisReviewState } from '../types';

interface ReviewFiltersProps {
  stateFilter: CrisisReviewState | 'all';
  ownerFilter: 'me' | 'unassigned' | 'all';
  escalatedOnly: boolean;
  onStateChange: (state: CrisisReviewState | 'all') => void;
  onOwnerChange: (owner: 'me' | 'unassigned' | 'all') => void;
  onEscalatedChange: (escalated: boolean) => void;
}

export function ReviewFilters({
  stateFilter,
  ownerFilter,
  escalatedOnly,
  onStateChange,
  onOwnerChange,
  onEscalatedChange,
}: ReviewFiltersProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label
            htmlFor="state-filter"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            State
          </label>
          <select
            id="state-filter"
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={stateFilter}
            onChange={(e) => onStateChange(e.target.value as any)}
          >
            <option value="all">All states</option>
            <option value="new">New</option>
            <option value="assigned">Assigned</option>
            <option value="in_review">In Review</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="owner-filter"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Owner
          </label>
          <select
            id="owner-filter"
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={ownerFilter}
            onChange={(e) => onOwnerChange(e.target.value as any)}
          >
            <option value="all">All owners</option>
            <option value="me">Assigned to me</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </div>

        <div className="flex items-end">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={escalatedOnly}
              onChange={(e) => onEscalatedChange(e.target.checked)}
            />
            <span className="ml-2 text-sm text-gray-700">
              Escalated to lead only
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
