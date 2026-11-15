/**
 * W3.1: Crisis Review Actions Hook
 * Assign, transition, reveal contact
 */

import { useState } from 'react';
import { CrisisReviewState, CrisisOutcome, RevealedContact } from '../types';
import { crisisReviewsApi } from '../api';

export function useCrisisActions(reviewId: string) {
  const [isActing, setIsActing] = useState(false);

  const assign = async (ownerId: string): Promise<void> => {
    setIsActing(true);
    try {
      await crisisReviewsApi.assign(reviewId, ownerId);
    } finally {
      setIsActing(false);
    }
  };

  const transition = async (
    toState: CrisisReviewState,
    outcome?: CrisisOutcome,
    reason?: string,
  ): Promise<void> => {
    setIsActing(true);
    try {
      await crisisReviewsApi.transition(reviewId, toState, outcome, reason);
    } finally {
      setIsActing(false);
    }
  };

  const revealContact = async (reason: string): Promise<RevealedContact> => {
    setIsActing(true);
    try {
      return await crisisReviewsApi.revealContact(reviewId, reason);
    } finally {
      setIsActing(false);
    }
  };

  return {
    assign,
    transition,
    revealContact,
    isActing,
  };
}
