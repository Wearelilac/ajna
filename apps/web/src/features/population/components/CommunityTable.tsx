/**
 * W4.1: Community Table
 */

import React from 'react';
import { Community } from '../types';

interface Props {
  communities: Community[];
}

export function CommunityTable({ communities }: Props) {
  if (communities.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No communities found. Data may not be ready yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Community
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Region
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Deprivation
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Subjects
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Avg PRI
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Deviation %
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {communities.map((community) => (
            <tr key={community.communityId} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{community.name}</div>
                <div className="text-xs text-gray-500">
                  Pop: {community.populationEstimate?.toLocaleString() || 'N/A'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {community.regionCode}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <DeprivationBadge value={community.deprivationIndex} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {community.suppressed ? (
                  <span className="text-gray-400 italic">Suppressed</span>
                ) : (
                  community.subjectsN?.toLocaleString() || 'N/A'
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {community.suppressed ? (
                  <span className="text-gray-400 italic">—</span>
                ) : community.meanPri ? (
                  <PRIBadge value={community.meanPri} />
                ) : (
                  <span className="text-gray-400">N/A</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {community.suppressed ? (
                  <span className="text-gray-400 italic">—</span>
                ) : community.deviationShare ? (
                  `${Math.round(community.deviationShare * 100)}%`
                ) : (
                  'N/A'
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {community.suppressed ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    K &lt; 10
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Released
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeprivationBadge({ value }: { value: number }) {
  const percent = Math.round(value * 100);
  const className =
    value > 0.7
      ? 'bg-red-100 text-red-800'
      : value > 0.4
        ? 'bg-yellow-100 text-yellow-800'
        : 'bg-green-100 text-green-800';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      {percent}%
    </span>
  );
}

function PRIBadge({ value }: { value: number }) {
  const rounded = Math.round(value);
  const className =
    rounded < 40
      ? 'bg-red-100 text-red-800'
      : rounded < 60
        ? 'bg-yellow-100 text-yellow-800'
        : 'bg-green-100 text-green-800';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      {rounded}
    </span>
  );
}
