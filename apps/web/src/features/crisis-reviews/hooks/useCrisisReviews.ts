/**
 * W3.1: Crisis Reviews List Hook
 * GET /v1/crisis-reviews with filters
 */

import { useState, useEffect, useCallback } from 'react';
import { CrisisReview } from '../types';
import { crisisReviewsApi } from '../api';

interface UseCrisisReviewsParams {
  state?: string;
  ownerId?: string;
  escalatedToLead?: string;
}

export function useCrisisReviews(params: UseCrisisReviewsParams) {
  const [reviews, setReviews] = useState<CrisisReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await crisisReviewsApi.list(params);
      setReviews(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load reviews');
    } finally {
      setIsLoading(false);
    }
  }, [params.state, params.ownerId, params.escalatedToLead]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  return {
    reviews,
    isLoading,
    error,
    refetch: fetchReviews,
  };
}
