/**
 * W4.1: Population Dashboard API Client
 */

import { PopulationOverview, Community, Cluster } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function fetchPopulationOverview(): Promise<PopulationOverview> {
  const response = await fetch(`${API_BASE}/v1/population/overview`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`,
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
  const queryParams = new URLSearchParams();
  if (params.regionCode) queryParams.append('regionCode', params.regionCode);
  if (params.sort) queryParams.append('sort', params.sort);
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.offset) queryParams.append('offset', params.offset.toString());

  const response = await fetch(`${API_BASE}/v1/population/communities?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch communities');
  }

  return response.json();
}

export async function fetchClusters(): Promise<Cluster[]> {
  const response = await fetch(`${API_BASE}/v1/population/clusters`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch clusters');
  }

  return response.json();
}

function getToken(): string {
  // TODO: Get from auth context
  return '';
}
