/**
 * W4.2: Draft Detail Modal (Review Workflow)
 */

import React, { useState } from 'react';
import { OutreachDraft } from '../types';
import { transitionDraft, updateDraftBody } from '../api';

interface Props {
  draft: OutreachDraft;
  onClose: () => void;
  onUpdate: () => void;
}

export function DraftDetailModal({ draft, onClose, onUpdate }: Props) {
  const [body, setBody] = useState(draft.body);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTransition = async (toStatus: string, editedBody?: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      await transitionDraft(draft.id, toStatus, reason || undefined, editedBody);
      onUpdate();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transition draft');
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableActions = getAvailableActions(draft.status);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg max-w-3xl w-full p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Draft Review</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Draft Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                disabled={draft.status !== 'draft' && draft.status !== 'in_review'}
              />
              <p className="mt-1 text-xs text-gray-500">{body.length} characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason (optional)</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., Minor wording fixes"
              />
            </div>

            <div className="flex items-center gap-3 pt-4 border-t">
              {availableActions.map((action) => (
                <button
                  key={action.toStatus}
                  onClick={() => {
                    if (action.requiresEdits) {
                      handleTransition(action.toStatus, body);
                    } else {
                      handleTransition(action.toStatus);
                    }
                  }}
                  disabled={isSubmitting}
                  className={`px-4 py-2 rounded font-medium ${action.className} disabled:opacity-50`}
                >
                  {action.label}
                </button>
              ))}
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getAvailableActions(status: string) {
  const actions: Array<{
    toStatus: string;
    label: string;
    className: string;
    requiresEdits: boolean;
  }> = [];

  if (status === 'draft') {
    actions.push({
      toStatus: 'in_review',
      label: 'Start Review',
      className: 'bg-blue-600 text-white hover:bg-blue-700',
      requiresEdits: false,
    });
  }

  if (status === 'in_review') {
    actions.push({
      toStatus: 'approved',
      label: 'Approve',
      className: 'bg-green-600 text-white hover:bg-green-700',
      requiresEdits: false,
    });
    actions.push({
      toStatus: 'edited_approved',
      label: 'Edit & Approve',
      className: 'bg-green-600 text-white hover:bg-green-700',
      requiresEdits: true,
    });
    actions.push({
      toStatus: 'rejected',
      label: 'Reject',
      className: 'bg-red-600 text-white hover:bg-red-700',
      requiresEdits: false,
    });
  }

  if (status === 'approved' || status === 'edited_approved' || status === 'rejected') {
    actions.push({
      toStatus: 'closed',
      label: 'Close',
      className: 'bg-gray-600 text-white hover:bg-gray-700',
      requiresEdits: false,
    });
  }

  if (status === 'rejected') {
    actions.push({
      toStatus: 'in_review',
      label: 'Re-review',
      className: 'bg-blue-600 text-white hover:bg-blue-700',
      requiresEdits: false,
    });
  }

  return actions;
}
