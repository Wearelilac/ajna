/**
 * W4.1: Community Filters
 */

import React from 'react';

interface Props {
  regionFilter: string;
  sortBy: string;
  onRegionChange: (region: string) => void;
  onSortChange: (sort: string) => void;
}

export function CommunityFilters({
  regionFilter,
  sortBy,
  onRegionChange,
  onSortChange,
}: Props) {
  return (
    <div className="mb-6 flex items-center gap-4">
      <div className="flex-1">
        <label htmlFor="region" className="block text-sm font-medium text-gray-700 mb-1">
          Filter by Region
        </label>
        <select
          id="region"
          value={regionFilter}
          onChange={(e) => onRegionChange(e.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Regions</option>
          <option value="US-CA">California</option>
          <option value="US-TX">Texas</option>
          <option value="US-NY">New York</option>
          <option value="US-FL">Florida</option>
        </select>
      </div>

      <div className="flex-1">
        <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-1">
          Sort By
        </label>
        <select
          id="sort"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="name">Name</option>
          <option value="deprivation">Deprivation (High to Low)</option>
        </select>
      </div>
    </div>
  );
}
