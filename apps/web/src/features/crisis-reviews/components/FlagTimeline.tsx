/**
 * W3.1: Flag Timeline Component
 * Shows de-identified flags grouped by hour bucket
 */

import React from 'react';
import { DeIdentifiedFlagSummary } from '../types';

interface FlagTimelineProps {
  flags: DeIdentifiedFlagSummary[];
}

export function FlagTimeline({ flags }: FlagTimelineProps) {
  if (flags.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Flagged Signals ({flags.length})
      </h2>

      <div className="space-y-3">
        {flags.map((flag) => (
          <div
            key={flag.id}
            className="flex items-start justify-between border-l-4 border-blue-400 pl-4 py-2"
          >
            <div>
              <div className="font-medium text-gray-900">{flag.signature}</div>
              <div className="text-sm text-gray-600 mt-1">
                Confidence: {(flag.confidence * 100).toFixed(0)}%
                <span className="mx-2">•</span>
                Time bucket: {new Date(flag.timeBucket).toLocaleString()}
                <span className="mx-2">•</span>
                Model: {flag.modelVersion}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-600">
        <strong>Note:</strong> Flags show de-identified patterns only. No audio,
        transcript, or precise location data.
      </div>
    </div>
  );
}
