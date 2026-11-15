/**
 * W4.1: Population Data Hook
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchPopulationOverview, fetchCommunities, fetchClusters } from '../api';
import { PopulationOverview, Community, Cluster } from '../types';

interface UsePopulationDataParams {
  regionCode?: string;
  sort?: string;
}

export function usePopulationData(params: UsePopulationDataParams) {
  const [overview, setOverview] = useState<PopulationOverview | null>(null);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [overviewData, communitiesData, clustersData] = await Promise.all([
        fetchPopulationOverview(),
        fetchCommunities({ regionCode: params.regionCode, sort: params.sort }),
        fetchClusters(),
      ]);

      setOverview(overviewData);
      setCommunities(communitiesData);
      setClusters(clustersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load population data');
    } finally {
      setIsLoading(false);
    }
  }, [params.regionCode, params.sort]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    overview,
    communities,
    clusters,
    isLoading,
    error,
    refetch: fetchAll,
  };
}
