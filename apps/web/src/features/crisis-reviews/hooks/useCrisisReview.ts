/**
 * W3.1: Single Crisis Review Hook
 * GET /v1/crisis-reviews/:id with flags
 */

import { useState, useEffect, useCallback } from 'react';
import { CrisisReview } from '../types';
import { crisisReviewsApi } from '../api';

export function useCrisisReview(reviewId: string) {
  const [review, setReview] = useState<CrisisReview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReview = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await crisisReviewsApi.get(reviewId);
      setReview(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load review');
    } finally {
      setIsLoading(false);
    }
  }, [reviewId]);

  useEffect(() => {
    fetchReview();
  }, [fetchReview]);

  return {
    review,
    isLoading,
    error,
    refetch: fetchReview,
  };
}
