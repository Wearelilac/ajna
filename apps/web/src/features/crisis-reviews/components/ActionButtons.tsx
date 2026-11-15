/**
 * W3.1: Action Buttons Component
 * Shows legal transitions based on current state
 * State machine: new → assigned → in_review → closed
 */

import React from 'react';
import { CrisisReview, CrisisReviewState } from '../types';

interface ActionButtonsProps {
  review: CrisisReview;
  onAssign: () => void;
  onTransition: (toState: CrisisReviewState) => void;
  onRevealContact: () => void;
  isActing: boolean;
}

export function ActionButtons({
  review,
  onAssign,
  onTransition,
  onRevealContact,
  isActing,
}: ActionButtonsProps) {
  const legalTransitions = getLegalTransitions(review.state);
  const canAssign = review.state === 'new' && !review.ownerId;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>

      <div className="flex flex-wrap gap-3">
        {canAssign && (
          <button
            onClick={onAssign}
            disabled={isActing}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Assign to Me
          </button>
        )}

        {legalTransitions.map((toState) => (
          <button
            key={toState}
            onClick={() => onTransition(toState)}
            disabled={isActing}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
          >
            {getTransitionLabel(toState)}
          </button>
        ))}

        <button
          onClick={onRevealContact}
          disabled={isActing}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
        >
          Reveal Contact
        </button>
      </div>
    </div>
  );
}

function getLegalTransitions(currentState: CrisisReviewState): CrisisReviewState[] {
  const stateMachine: Record<CrisisReviewState, CrisisReviewState[]> = {
    new: ['assigned'],
    assigned: ['in_review', 'new'],
    in_review: ['closed', 'assigned'],
    closed: [],
  };

  return stateMachine[currentState] || [];
}

function getTransitionLabel(state: CrisisReviewState): string {
  const labels: Record<CrisisReviewState, string> = {
    new: 'Unassign',
    assigned: 'Assign',
    in_review: 'Start Review',
    closed: 'Close',
  };

  return labels[state] || state;
}
