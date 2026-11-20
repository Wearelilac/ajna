/**
 * W4.1: Population Risk Dashboard
 * /population route - Community-level risk aggregates
 * K-anonymity enforced (K≥10), NO row-level data
 */

'use client';

import React, { useState } from 'react';
import { usePopulationData } from './hooks/usePopulationData';
import { PopulationOverview } from './components/PopulationOverview';
import { CommunityTable } from './components/CommunityTable';
import { CommunityFilters } from './components/CommunityFilters';
import { ClusterView } from './components/ClusterView';
import { PrivacyNotice } from './components/PrivacyNotice';

export function PopulationDashboardPage() {
  const [view, setView] = useState<'communities' | 'clusters'>('communities');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'deprivation'>('name');

  const {
    overview,
    communities,
    clusters,
    isLoading,
    error,
    refetch,
  } = usePopulationData({
    regionCode: regionFilter === 'all' ? undefined : regionFilter,
    sort: sortBy,
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Population Risk Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Community-level resilience trends and underserved populations
          </p>
        </div>

        <PrivacyNotice />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        ) : (
          <>
            <PopulationOverview overview={overview} />

            <div className="mt-6 bg-white rounded-lg shadow">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6" aria-label="Tabs">
                  <button
                    onClick={() => setView('communities')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      view === 'communities'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Communities
                  </button>
                  <button
                    onClick={() => setView('clusters')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      view === 'clusters'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Underserved Clusters
                  </button>
                </nav>
              </div>

              <div className="p-6">
                {view === 'communities' ? (
                  <>
                    <CommunityFilters
                      regionFilter={regionFilter}
                      sortBy={sortBy}
                      onRegionChange={setRegionFilter}
                      onSortChange={(sort) =>
                        setSortBy(sort === 'deprivation' ? 'deprivation' : 'name')
                      }
                    />
                    <CommunityTable communities={communities} />
                  </>
                ) : (
                  <ClusterView clusters={clusters} />
                )}
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
              <button
                onClick={() => refetch()}
                className="ml-4 text-blue-600 hover:text-blue-800"
              >
                Refresh now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
