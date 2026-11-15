/**
 * W3.1: Review Header Component
 * Shows review summary and revealed contact (if any)
 */

import React from 'react';
import { CrisisReview } from '../types';

interface ReviewHeaderProps {
  review: CrisisReview;
  revealedContact?: {
    subjectId: string;
    emergencyContact?: string;
    emergencyPhone?: string;
  } | null;
}

export function ReviewHeader({ review, revealedContact }: ReviewHeaderProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Review Item {review.id.substring(0, 8)}
          </h1>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>State: <strong>{review.state}</strong></span>
            <span>•</span>
            <span>Flags: <strong>{review.flagCount}</strong></span>
            <span>•</span>
            <span>
              Created:{' '}
              <strong>{new Date(review.createdAt).toLocaleString()}</strong>
            </span>
          </div>
        </div>
        {review.escalatedToLead && (
          <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-semibold rounded-full">
            Escalated to Lead
          </span>
        )}
      </div>

      {review.ownerId && (
        <div className="mb-4">
          <span className="text-sm text-gray-600">
            Owner: <strong>{review.ownerId}</strong>
          </span>
          {review.assignedAt && (
            <span className="text-sm text-gray-500 ml-4">
              Assigned: {new Date(review.assignedAt).toLocaleString()}
            </span>
          )}
        </div>
      )}

      {review.outcome && (
        <div className="mb-4">
          <span className="text-sm text-gray-600">
            Outcome: <strong className="text-blue-600">{review.outcome}</strong>
          </span>
          {review.closedAt && (
            <span className="text-sm text-gray-500 ml-4">
              Closed: {new Date(review.closedAt).toLocaleString()}
            </span>
          )}
        </div>
      )}

      {revealedContact && (
        <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-400 rounded">
          <h3 className="font-semibold text-red-900 mb-2">Contact Information (Revealed)</h3>
          <div className="text-sm text-red-800 space-y-1">
            <p>Subject ID: <strong>{revealedContact.subjectId}</strong></p>
            {revealedContact.emergencyContact && (
              <p>Emergency Contact: <strong>{revealedContact.emergencyContact}</strong></p>
            )}
            {revealedContact.emergencyPhone && (
              <p>Phone: <strong>{revealedContact.emergencyPhone}</strong></p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
