/**
 * W4.1: Population Dashboard API Client
 * Uses demo store when no NEXT_PUBLIC_API_URL is set.
 */

import { PopulationOverview, Community, Cluster } from './types';
import { getApiBase, isDemoMode } from '@/demo/config';
import { demoStore } from '@/demo/store';

export async function fetchPopulationOverview(): Promise<PopulationOverview> {
  if (isDemoMode()) {
    return demoStore.getOverview();
  }

  const response = await fetch(`${getApiBase()}/v1/population/overview`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch population overview');
  }

  return response.json();
}

export async function fetchCommunities(params: {
  regionCode?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}): Promise<Community[]> {
  if (isDemoMode()) {
    return demoStore.getCommunities({
      regionCode: params.regionCode,
      sort: params.sort,
    });
  }

  const queryParams = new URLSearchParams();
  if (params.regionCode) queryParams.append('regionCode', params.regionCode);
  if (params.sort) queryParams.append('sort', params.sort);
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.offset) queryParams.append('offset', params.offset.toString());

  const response = await fetch(
    `${getApiBase()}/v1/population/communities?${queryParams}`,
    {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error('Failed to fetch communities');
  }

  return response.json();
}

export async function fetchClusters(): Promise<Cluster[]> {
  if (isDemoMode()) {
    return demoStore.getClusters();
  }

  const response = await fetch(`${getApiBase()}/v1/population/clusters`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch clusters');
  }

  return response.json();
}

function getToken(): string {
  return '';
}
