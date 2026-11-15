/**
 * W4.2: Care-Gap Data Hook
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchDrafts } from '../api';
import { OutreachDraft } from '../types';

interface UseCareGapDataParams {
  status?: string;
}

export function useCareGapData(params: UseCareGapDataParams) {
  const [drafts, setDrafts] = useState<OutreachDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const draftsData = await fetchDrafts({ status: params.status });
      setDrafts(draftsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load drafts');
    } finally {
      setIsLoading(false);
    }
  }, [params.status]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    drafts,
    isLoading,
    error,
    refetch: fetchAll,
  };
}
