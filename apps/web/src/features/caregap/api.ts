/**
 * W4.2: Care-Gap Review API Client
 */

import { OutreachDraft, CareGap, PathwayMatch } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function fetchDrafts(params: { status?: string }): Promise<OutreachDraft[]> {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append('status', params.status);

  const response = await fetch(`${API_BASE}/v1/outreach-drafts?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch drafts');
  }

  return response.json();
}

export async function fetchGap(gapId: string): Promise<CareGap> {
  const response = await fetch(`${API_BASE}/v1/care-gaps/${gapId}`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch care gap');
  }

  return response.json();
}

export async function fetchMatches(gapId: string): Promise<PathwayMatch[]> {
  const response = await fetch(`${API_BASE}/v1/care-gaps/${gapId}/matches`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch matches');
  }

  return response.json();
}

export async function updateDraftBody(draftId: string, body: string): Promise<void> {
  const response = await fetch(`${API_BASE}/v1/outreach-drafts/${draftId}/body`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to update draft body');
  }
}

export async function transitionDraft(
  draftId: string,
  toStatus: string,
  reason?: string,
  editedBody?: string,
): Promise<void> {
  const response = await fetch(`${API_BASE}/v1/outreach-drafts/${draftId}/transition`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ toStatus, reason, editedBody }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to transition draft');
  }
}

function getToken(): string {
  // TODO: Get from auth context
  return '';
}
