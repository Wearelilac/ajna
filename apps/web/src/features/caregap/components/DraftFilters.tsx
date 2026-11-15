/**
 * W4.2: Draft Filters
 */

import React from 'react';

interface Props {
  statusFilter: string;
  onStatusChange: (status: string) => void;
}

export function DraftFilters({ statusFilter, onStatusChange }: Props) {
  return (
    <div className="mb-6 bg-white rounded-lg shadow p-4">
      <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
        Filter by Status
      </label>
      <select
        id="status"
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
        className="block w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="all">All Statuses</option>
        <option value="draft">Draft</option>
        <option value="in_review">In Review</option>
        <option value="approved">Approved</option>
        <option value="edited_approved">Edited & Approved</option>
        <option value="rejected">Rejected</option>
        <option value="closed">Closed</option>
      </select>
    </div>
  );
}
