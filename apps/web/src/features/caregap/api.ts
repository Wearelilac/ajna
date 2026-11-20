/**
 * W4.2: Care-Gap Review API Client
 * Uses demo store when no NEXT_PUBLIC_API_URL is set.
 */

import { OutreachDraft, CareGap, PathwayMatch } from './types';
import { getApiBase, isDemoMode } from '@/demo/config';
import { demoStore } from '@/demo/store';

export async function fetchDrafts(params: { status?: string }): Promise<OutreachDraft[]> {
  if (isDemoMode()) {
    return demoStore.listDrafts(params);
  }

  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append('status', params.status);

  const response = await fetch(`${getApiBase()}/v1/outreach-drafts?${queryParams}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch drafts');
  }

  return response.json();
}

export async function fetchGap(gapId: string): Promise<CareGap> {
  if (isDemoMode()) {
    return {
      id: gapId,
      subjectId: 'subj-demo-masked',
      gapType: 'well_child_visit',
      dueDate: null,
      indicatorSummary: { daysOverdue: 45 },
      status: 'open',
      createdAt: new Date().toISOString(),
    };
  }

  const response = await fetch(`${getApiBase()}/v1/care-gaps/${gapId}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch care gap');
  }

  return response.json();
}

export async function fetchMatches(gapId: string): Promise<PathwayMatch[]> {
  if (isDemoMode()) {
    return [
      {
        id: `match-${gapId}-1`,
        pathwayId: 'path-well-child',
        rank: 1,
        similarity: 0.91,
        filteredBy: { ageBand: '0-5', region: 'US-CA' },
        pathwayTitle: 'Well-Child Visit Reminder',
        pathwayDescription: 'Advisory outreach for overdue preventive visits',
      },
    ];
  }

  const response = await fetch(`${getApiBase()}/v1/care-gaps/${gapId}/matches`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch matches');
  }

  return response.json();
}

export async function updateDraftBody(draftId: string, body: string): Promise<void> {
  if (isDemoMode()) {
    return demoStore.updateDraftBody(draftId, body);
  }

  const response = await fetch(`${getApiBase()}/v1/outreach-drafts/${draftId}/body`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${getToken()}`,
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
  if (isDemoMode()) {
    return demoStore.transitionDraft(draftId, toStatus, reason, editedBody);
  }

  const response = await fetch(
    `${getApiBase()}/v1/outreach-drafts/${draftId}/transition`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ toStatus, reason, editedBody }),
    },
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to transition draft');
  }
}

function getToken(): string {
  return '';
}
