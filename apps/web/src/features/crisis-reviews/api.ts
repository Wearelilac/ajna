/**
 * W3.1: Crisis Reviews API Client
 * Client for B3.1 endpoints
 */

import {
  CrisisReview,
  CrisisReviewState,
  CrisisOutcome,
  RevealedContact,
  CrisisReviewEvent,
} from './types';

// TODO: Replace with generated client from openapi.v1.yaml
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const crisisReviewsApi = {
  /**
   * GET /v1/crisis-reviews
   */
  async list(params: {
    state?: string;
    ownerId?: string;
    escalatedToLead?: string;
  }): Promise<CrisisReview[]> {
    const query = new URLSearchParams();
    if (params.state) query.append('state', params.state);
    if (params.ownerId) query.append('ownerId', params.ownerId);
    if (params.escalatedToLead) query.append('escalatedToLead', params.escalatedToLead);

    const response = await fetch(`${API_BASE_URL}/v1/crisis-reviews?${query}`, {
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add auth cookie
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load reviews');
    }

    return await response.json();
  },

  /**
   * GET /v1/crisis-reviews/:id
   */
  async get(reviewId: string): Promise<CrisisReview> {
    const response = await fetch(`${API_BASE_URL}/v1/crisis-reviews/${reviewId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load review');
    }

    return await response.json();
  },

  /**
   * POST /v1/crisis-reviews/:id/assign
   */
  async assign(reviewId: string, ownerId: string): Promise<CrisisReview> {
    const response = await fetch(
      `${API_BASE_URL}/v1/crisis-reviews/${reviewId}/assign`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

  /**
   * POST /v1/crisis-reviews/:id/transition
   */
  async transition(
    reviewId: string,
    toState: CrisisReviewState,
    outcome?: CrisisOutcome,
    reason?: string,
  ): Promise<CrisisReview> {
    const response = await fetch(
      `${API_BASE_URL}/v1/crisis-reviews/${reviewId}/transition`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

  /**
   * POST /v1/crisis-reviews/:id/reveal-contact
   */
  async revealContact(reviewId: string, reason: string): Promise<RevealedContact> {
    const response = await fetch(
      `${API_BASE_URL}/v1/crisis-reviews/${reviewId}/reveal-contact`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
