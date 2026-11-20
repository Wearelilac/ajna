/**
 * W3.1: Crisis Review Detail Page
 * /review/[id] route - Detail view with actions
 * Assign, transition, record outcome, reveal contact
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCrisisReview } from './hooks/useCrisisReview';
import { useCrisisActions } from './hooks/useCrisisActions';
import { CrisisReviewState, CrisisOutcome } from './types';
import { ReviewHeader } from './components/ReviewHeader';
import { FlagTimeline } from './components/FlagTimeline';
import { StateHistory } from './components/StateHistory';
import { ActionButtons } from './components/ActionButtons';
import { RevealContactModal } from './components/RevealContactModal';
import { TransitionModal } from './components/TransitionModal';
import { SafetyNotice } from './components/SafetyNotice';

interface ReviewDetailPageProps {
  reviewId: string;
}

export function ReviewDetailPage({ reviewId }: ReviewDetailPageProps) {
  const { review, isLoading, error, refetch } = useCrisisReview(reviewId);
  const { assign, transition, revealContact, isActing } = useCrisisActions(reviewId);

  const [showRevealModal, setShowRevealModal] = useState(false);
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [transitionTo, setTransitionTo] = useState<CrisisReviewState | null>(null);
  const [revealedContact, setRevealedContact] = useState<{
    subjectId: string;
    emergencyContact?: string;
    emergencyPhone?: string;
  } | null>(null);

  const handleAssign = async () => {
    try {
      await assign('current-user-id'); // TODO: Get from auth
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to assign review');
    }
  };

  const handleTransition = async (
    toState: CrisisReviewState,
    outcome?: CrisisOutcome,
    reason?: string,
  ) => {
    try {
      await transition(toState, outcome, reason);
      setShowTransitionModal(false);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to transition review');
    }
  };

  const handleRevealContact = async (reason: string) => {
    try {
      const contact = await revealContact(reason);
      setRevealedContact(contact);
      setShowRevealModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to reveal contact');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error || 'Review not found'}</p>
          </div>
          <Link
            href="/crisis-reviews"
            className="mt-4 inline-block text-blue-600 hover:text-blue-800"
          >
            ← Back to queue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/crisis-reviews"
          className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
        >
          ← Back to queue
        </Link>

        <SafetyNotice className="mb-6" />

        <ReviewHeader review={review} revealedContact={revealedContact} />

        <ActionButtons
          review={review}
          onAssign={handleAssign}
          onTransition={(toState) => {
            setTransitionTo(toState);
            setShowTransitionModal(true);
          }}
          onRevealContact={() => setShowRevealModal(true)}
          isActing={isActing}
        />

        {review.flags && <FlagTimeline flags={review.flags} />}

        <StateHistory reviewId={reviewId} />

        {showRevealModal && (
          <RevealContactModal
            onConfirm={handleRevealContact}
            onClose={() => setShowRevealModal(false)}
          />
        )}

        {showTransitionModal && transitionTo && (
          <TransitionModal
            currentState={review.state}
            toState={transitionTo}
            onConfirm={handleTransition}
            onClose={() => {
              setShowTransitionModal(false);
              setTransitionTo(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
