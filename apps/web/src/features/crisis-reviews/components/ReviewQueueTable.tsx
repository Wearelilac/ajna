/**
 * W3.1: Review Queue Table
 * Shows: state, owner, flag count, last flag time, age, SLA status
 * Accessible, keyboard-friendly
 */

import React from 'react';
import Link from 'next/link';
import { CrisisReview } from '../types';

interface ReviewQueueTableProps {
  reviews: CrisisReview[];
}

export function ReviewQueueTable({ reviews }: ReviewQueueTableProps) {
  if (reviews.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-600">No reviews in queue</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              State
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Owner
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Flags
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Last Flag
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Age
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              SLA
            </th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {reviews.map((review) => (
            <ReviewQueueRow key={review.id} review={review} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReviewQueueRow({ review }: { review: CrisisReview }) {
  const age = getAge(review.createdAt);
  const slaStatus = getSLAStatus(review.createdAt, review.state);

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <StateBadge state={review.state} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {review.ownerId ? (
          <span>{review.ownerId}</span>
        ) : (
          <span className="text-gray-400 italic">Unassigned</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {review.flagCount}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {formatTimestamp(review.lastFlagAt)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{age}</td>
      <td className="px-6 py-4 whitespace-nowrap">
        <SLABadge status={slaStatus} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <Link
          href={`/crisis-reviews/${review.id}`}
          className="text-blue-600 hover:text-blue-900"
        >
          View
        </Link>
      </td>
    </tr>
  );
}

function StateBadge({ state }: { state: string }) {
  const colors = {
    new: 'bg-blue-100 text-blue-800',
    assigned: 'bg-yellow-100 text-yellow-800',
    in_review: 'bg-purple-100 text-purple-800',
    closed: 'bg-gray-100 text-gray-800',
  };

  return (
    <span
      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
        colors[state as keyof typeof colors] || 'bg-gray-100 text-gray-800'
      }`}
    >
      {state}
    </span>
  );
}

function SLABadge({ status }: { status: 'ok' | 'warning' | 'breached' }) {
  const colors = {
    ok: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    breached: 'bg-red-100 text-red-800',
  };

  const labels = {
    ok: 'On track',
    warning: 'Near SLA',
    breached: 'SLA breached',
  };

  return (
    <span
      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colors[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function getAge(createdAt: string): string {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) {
    return `${diffMins}m`;
  } else if (diffMins < 1440) {
    return `${Math.floor(diffMins / 60)}h`;
  } else {
    return `${Math.floor(diffMins / 1440)}d`;
  }
}

function getSLAStatus(
  createdAt: string,
  state: string,
): 'ok' | 'warning' | 'breached' {
  if (state !== 'new') {
    return 'ok'; // SLA only applies to unassigned items
  }

  const created = new Date(createdAt);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - created.getTime()) / 60000);

  const SLA_MIN = 60; // 1 hour default
  const WARNING_THRESHOLD = 0.8;

  if (diffMins > SLA_MIN) {
    return 'breached';
  } else if (diffMins > SLA_MIN * WARNING_THRESHOLD) {
    return 'warning';
  } else {
    return 'ok';
  }
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffMins < 1440) {
    return `${Math.floor(diffMins / 60)}h ago`;
  } else {
    return date.toLocaleDateString();
  }
}
