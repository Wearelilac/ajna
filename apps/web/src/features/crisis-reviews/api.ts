/**
 * W3.1: Crisis Reviews API Client
 * Uses demo store when no NEXT_PUBLIC_API_URL is set.
 */

import {
  CrisisReview,
  CrisisReviewState,
  CrisisOutcome,
  RevealedContact,
  CrisisReviewEvent,
} from './types';
import { getApiBase, isDemoMode } from '@/demo/config';
import { demoStore } from '@/demo/store';

export const crisisReviewsApi = {
  async list(params: {
    state?: string;
    ownerId?: string;
    escalatedToLead?: string;
  }): Promise<CrisisReview[]> {
    if (isDemoMode()) {
      return demoStore.listReviews(params);
    }

    const query = new URLSearchParams();
    if (params.state) query.append('state', params.state);
    if (params.ownerId) query.append('ownerId', params.ownerId);
    if (params.escalatedToLead) query.append('escalatedToLead', params.escalatedToLead);

    const response = await fetch(`${getApiBase()}/v1/crisis-reviews?${query}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load reviews');
    }

    return await response.json();
  },

  async get(reviewId: string): Promise<CrisisReview> {
    if (isDemoMode()) {
      return demoStore.getReview(reviewId);
    }

    const response = await fetch(`${getApiBase()}/v1/crisis-reviews/${reviewId}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load review');
    }

    return await response.json();
  },

  async events(reviewId: string): Promise<CrisisReviewEvent[]> {
    if (isDemoMode()) {
      return demoStore.getEvents(reviewId);
    }

    const response = await fetch(
      `${getApiBase()}/v1/crisis-reviews/${reviewId}/events`,
      {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      },
    );

    if (!response.ok) {
      return [];
    }

    return await response.json();
  },

  async assign(reviewId: string, ownerId: string): Promise<CrisisReview> {
    if (isDemoMode()) {
      return demoStore.assign(reviewId, ownerId);
    }

    const response = await fetch(
      `${getApiBase()}/v1/crisis-reviews/${reviewId}/assign`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId }),
        credentials: 'include',
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to assign review');
    }

    return await response.json();
  },

  async transition(
    reviewId: string,
    toState: CrisisReviewState,
    outcome?: CrisisOutcome,
    reason?: string,
  ): Promise<CrisisReview> {
    if (isDemoMode()) {
      return demoStore.transition(reviewId, toState, outcome, reason);
    }

    const response = await fetch(
      `${getApiBase()}/v1/crisis-reviews/${reviewId}/transition`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toState, outcome, reason }),
        credentials: 'include',
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to transition review');
    }

    return await response.json();
  },

  async revealContact(reviewId: string, reason: string): Promise<RevealedContact> {
    if (isDemoMode()) {
      return demoStore.revealContact(reviewId, reason);
    }

    const response = await fetch(
      `${getApiBase()}/v1/crisis-reviews/${reviewId}/reveal-contact`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
        credentials: 'include',
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to reveal contact');
    }

    return await response.json();
  },
};
