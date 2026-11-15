/**
 * W3.1: Reveal Contact Modal
 * Guarded: requires typed reason and confirmation
 * Writes audit trail
 */

import React, { useState } from 'react';

interface RevealContactModalProps {
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

export function RevealContactModal({
  onConfirm,
  onClose,
}: RevealContactModalProps) {
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const isReasonValid = reason.trim().length >= 20;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReasonValid && confirmed) {
      onConfirm(reason.trim());
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
              Reveal Contact Information
            </h3>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <p className="text-sm text-yellow-800">
                This action will reveal de-identified subject contact details and
                write an audit record.
              </p>
            </div>

            <div className="mb-4">
              <label
                htmlFor="reason"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Reason for revealing contact (minimum 20 characters):
              </label>
              <textarea
                id="reason"
                rows={4}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Example: Routine follow-up required based on flag pattern..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                {reason.trim().length} / 20 characters
              </p>
            </div>

            <div className="mb-4">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  required
                />
                <span className="ml-2 text-sm text-gray-700">
                  I confirm this access is necessary and complies with our crisis
                  review procedure
                </span>
              </label>
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
                disabled={!isReasonValid || !confirmed}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reveal Contact
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
