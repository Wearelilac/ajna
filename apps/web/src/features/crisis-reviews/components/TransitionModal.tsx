/**
 * W3.1: Transition Modal
 * Record outcome when closing (required)
 * Optional reason for other transitions
 */

import React, { useState } from 'react';
import { CrisisReviewState, CrisisOutcome } from '../types';

interface TransitionModalProps {
  currentState: CrisisReviewState;
  toState: CrisisReviewState;
  onConfirm: (
    toState: CrisisReviewState,
    outcome?: CrisisOutcome,
    reason?: string,
  ) => void;
  onClose: () => void;
}

export function TransitionModal({
  currentState,
  toState,
  onConfirm,
  onClose,
}: TransitionModalProps) {
  const [outcome, setOutcome] = useState<CrisisOutcome>('no_action');
  const [reason, setReason] = useState('');

  const requiresOutcome = toState === 'closed';
  const isReasonValid = !requiresOutcome || reason.trim().length >= 10;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReasonValid) {
      onConfirm(
        toState,
        requiresOutcome ? outcome : undefined,
        reason.trim() || undefined,
      );
    }
  };

  return (
    <div
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      onClick={onClose}
    >
      <div
        className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="mt-3">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Transition Review: {currentState} → {toState}
            </h3>

            {requiresOutcome && (
              <div className="mb-4">
                <label
                  htmlFor="outcome"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Outcome (required):
                </label>
                <select
                  id="outcome"
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value as CrisisOutcome)}
                  required
                >
                  <option value="no_action">No action needed</option>
                  <option value="routine_follow_up_requested">
                    Routine follow-up requested
                  </option>
                  <option value="escalated_to_clinical_lead">
                    Escalated to clinical lead
                  </option>
                </select>
              </div>
            )}

            <div className="mb-4">
              <label
                htmlFor="reason"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Reason {requiresOutcome ? '(required, min 10 characters)' : '(optional)'}:
              </label>
              <textarea
                id="reason"
                rows={3}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Example: Reviewed flag pattern, no immediate concern..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required={requiresOutcome}
              />
              {requiresOutcome && (
                <p className="mt-1 text-sm text-gray-500">
                  {reason.trim().length} / 10 characters
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isReasonValid}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Transition
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
