/**
 * Client-side demo store (localStorage).
 * Member actions, staff workflows, and inbox share one snapshot.
 */

'use client';

import type { Community, Cluster, PopulationOverview } from '@/features/population/types';
import type {
  CrisisOutcome,
  CrisisReview,
  CrisisReviewEvent,
  CrisisReviewState,
  RevealedContact,
} from '@/features/crisis-reviews/types';
import type { OutreachDraft } from '@/features/caregap/types';
import {
  DEMO_CLUSTERS,
  DEMO_COMMUNITIES,
  DEMO_CONTACTS,
  DEMO_OVERVIEW,
  DEMO_USER,
  createInitialDrafts,
  createInitialEvents,
  createInitialReviews,
} from './seed';
import {
  type CheckIn,
  type ConsentKey,
  type InboxItem,
  type ListenSession,
  type MemberState,
  type ScenarioId,
  CONSENT_COPY,
  createInitialMember,
  memberForScenario,
} from './member';

const STORAGE_KEY = 'ajna-demo-v2';

interface DemoState {
  reviews: CrisisReview[];
  events: CrisisReviewEvent[];
  drafts: OutreachDraft[];
  user: typeof DEMO_USER | null;
  member: MemberState;
  contacts: typeof DEMO_CONTACTS;
}

export interface DemoSnapshot {
  reviews: CrisisReview[];
  events: CrisisReviewEvent[];
  drafts: OutreachDraft[];
  user: typeof DEMO_USER | null;
  member: MemberState;
  overview: PopulationOverview;
  communities: Community[];
  clusters: Cluster[];
}

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

function defaultState(): DemoState {
  return {
    reviews: createInitialReviews(),
    events: createInitialEvents(),
    drafts: createInitialDrafts(),
    user: DEMO_USER,
    member: createInitialMember(),
    contacts: { ...DEMO_CONTACTS },
  };
}

function read(): DemoState {
  if (typeof window === 'undefined') {
    return defaultState();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = defaultState();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as DemoState;
    if (!parsed.member) {
      parsed.member = createInitialMember();
    }
    if (!parsed.contacts) {
      parsed.contacts = { ...DEMO_CONTACTS };
    }
    return parsed;
  } catch {
    return defaultState();
  }
}

function write(state: DemoState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  emit();
}

function delay<T>(value: T, ms = 280): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function journal(
  state: DemoState,
  kind: MemberState['journal'][number]['kind'],
  title: string,
  detail: string,
) {
  state.member.journal.unshift({
    id: `j-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    at: new Date().toISOString(),
    kind,
    title,
    detail,
  });
  state.member.journal = state.member.journal.slice(0, 40);
}

const LEGAL: Record<CrisisReviewState, CrisisReviewState[]> = {
  new: ['assigned'],
  assigned: ['in_review', 'new'],
  in_review: ['closed', 'assigned'],
  closed: [],
};

const DRAFT_LEGAL: Record<string, string[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'edited_approved', 'rejected'],
  approved: ['closed'],
  edited_approved: ['closed'],
  rejected: ['closed', 'in_review'],
  closed: [],
};

function snapshotFrom(state: DemoState): DemoSnapshot {
  return {
    reviews: state.reviews.map((r) => ({ ...r, flags: [...(r.flags || [])] })),
    events: [...state.events],
    drafts: [...state.drafts],
    user: state.user,
    member: {
      ...state.member,
      consent: { ...state.member.consent },
      metrics: [...state.member.metrics],
      deviations: [...state.member.deviations],
      checkIns: [...state.member.checkIns],
      sessions: [...state.member.sessions],
      inbox: [...state.member.inbox],
      journal: [...state.member.journal],
      priHistory: [...state.member.priHistory],
    },
    overview: { ...DEMO_OVERVIEW },
    communities: [...DEMO_COMMUNITIES],
    clusters: [...DEMO_CLUSTERS],
  };
}

export const demoStore = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },

  snapshot(): DemoSnapshot {
    return snapshotFrom(read());
  },

  reset(): void {
    write(defaultState());
  },

  getUser() {
    return read().user;
  },

  login(email: string, _password: string) {
    const state = read();
    state.user = { ...DEMO_USER, email: email || DEMO_USER.email };
    write(state);
    return delay(state.user);
  },

  logout() {
    const state = read();
    state.user = null;
    write(state);
    return delay(undefined);
  },

  getOverview(): Promise<PopulationOverview> {
    return delay({ ...DEMO_OVERVIEW });
  },

  getCommunities(params: {
    regionCode?: string;
    sort?: string;
  }): Promise<Community[]> {
    let list = [...DEMO_COMMUNITIES];
    if (params.regionCode) {
      list = list.filter((c) => c.regionCode === params.regionCode);
    }
    if (params.sort === 'deprivation') {
      list.sort((a, b) => b.deprivationIndex - a.deprivationIndex);
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return delay(list);
  },

  getClusters(): Promise<Cluster[]> {
    return delay([...DEMO_CLUSTERS]);
  },

  listReviews(params: {
    state?: string;
    ownerId?: string;
    escalatedToLead?: string;
  }): Promise<CrisisReview[]> {
    let list = [...read().reviews];
    if (params.state) {
      list = list.filter((r) => r.state === params.state);
    }
    if (params.ownerId === 'current-user-id' || params.ownerId === DEMO_USER.id) {
      list = list.filter((r) => r.ownerId === DEMO_USER.id);
    }
    if (params.ownerId === '__unassigned__') {
      list = list.filter((r) => !r.ownerId);
    }
    if (params.escalatedToLead === 'true') {
      list = list.filter((r) => r.escalatedToLead);
    }
    list.sort(
      (a, b) => new Date(b.lastFlagAt).getTime() - new Date(a.lastFlagAt).getTime(),
    );
    return delay(list);
  },

  getReview(id: string): Promise<CrisisReview> {
    const review = read().reviews.find((r) => r.id === id);
    if (!review) {
      return Promise.reject(new Error('Review not found'));
    }
    return delay({ ...review, flags: [...(review.flags || [])] });
  },

  getEvents(reviewId: string): Promise<CrisisReviewEvent[]> {
    const events = read()
      .events.filter((e) => e.reviewId === reviewId)
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    return delay(events);
  },

  assign(reviewId: string, ownerId: string): Promise<CrisisReview> {
    const state = read();
    const review = state.reviews.find((r) => r.id === reviewId);
    if (!review) return Promise.reject(new Error('Review not found'));
    if (review.state !== 'new') {
      return Promise.reject(new Error('Only new reviews can be assigned'));
    }

    const from = review.state;
    review.state = 'assigned';
    review.ownerId = ownerId === 'current-user-id' ? DEMO_USER.id : ownerId;
    review.assignedAt = new Date().toISOString();
    state.events.push({
      id: `evt-${Date.now()}`,
      reviewId,
      fromState: from,
      toState: 'assigned',
      actorId: DEMO_USER.id,
      reason: 'Assigned from demo console',
      at: new Date().toISOString(),
    });
    journal(
      state,
      'reviewer',
      'Review assigned',
      `A human reviewer picked up ${reviewId.slice(0, 12)}… from the queue.`,
    );
    write(state);
    return delay({ ...review });
  },

  transition(
    reviewId: string,
    toState: CrisisReviewState,
    outcome?: CrisisOutcome,
    reason?: string,
  ): Promise<CrisisReview> {
    const state = read();
    const review = state.reviews.find((r) => r.id === reviewId);
    if (!review) return Promise.reject(new Error('Review not found'));

    const allowed = LEGAL[review.state] || [];
    if (!allowed.includes(toState)) {
      return Promise.reject(
        new Error(`Illegal transition: ${review.state} → ${toState}`),
      );
    }
    if (toState === 'closed' && !outcome) {
      return Promise.reject(new Error('Outcome required when closing'));
    }

    const from = review.state;
    review.state = toState;
    if (toState === 'new') {
      review.ownerId = undefined;
      review.assignedAt = undefined;
    }
    if (toState === 'closed') {
      review.outcome = outcome;
      review.closedAt = new Date().toISOString();
      if (outcome === 'escalated_to_clinical_lead') {
        review.escalatedToLead = true;
      }
      const memberNote: Record<CrisisOutcome, string> = {
        no_action:
          'A reviewer closed the advisory with no further action. Nothing was sent automatically.',
        routine_follow_up_requested:
          'A reviewer requested a routine follow-up. Your inbox may receive a human-approved note.',
        escalated_to_clinical_lead:
          'A reviewer escalated to a clinical lead using your organization procedure. This is not an emergency dispatch.',
      };
      if (outcome) {
        journal(state, 'reviewer', 'Review closed', memberNote[outcome]);
        if (outcome === 'routine_follow_up_requested' && state.member.consent.outreach) {
          const item: InboxItem = {
            id: `in-${Date.now()}`,
            at: new Date().toISOString(),
            title: 'Follow-up from care coordination',
            body: 'A reviewer asked us to check in. This note was approved by a human. Reply only if you want help connecting with your usual clinic.',
            pathway: 'path-reviewer-followup',
            status: 'delivered',
          };
          state.member.inbox.unshift(item);
        }
      }
    }

    state.events.push({
      id: `evt-${Date.now()}`,
      reviewId,
      fromState: from,
      toState,
      actorId: DEMO_USER.id,
      reason,
      at: new Date().toISOString(),
    });
    write(state);
    return delay({ ...review });
  },

  revealContact(reviewId: string, reason: string): Promise<RevealedContact> {
    if (!reason || reason.trim().length < 20) {
      return Promise.reject(new Error('Reason must be at least 20 characters'));
    }
    const state = read();
    const contact =
      state.contacts[reviewId] || {
        subjectId: 'subj-demo-live',
        emergencyContact: 'Jordan Lee (demo)',
        emergencyPhone: '+1-555-0101',
      };
    state.events.push({
      id: `evt-reveal-${Date.now()}`,
      reviewId,
      fromState: 'reveal',
      toState: 'reveal',
      actorId: DEMO_USER.id,
      reason: `REVEAL_CONTACT: ${reason.trim()}`,
      at: new Date().toISOString(),
    });
    journal(
      state,
      'privacy',
      'Contact vault opened',
      'Reveal is audited. The member identity stays masked in the queue list.',
    );
    write(state);

    return delay({
      ...contact,
      revealedAt: new Date().toISOString(),
      reason: reason.trim(),
    });
  },

  listDrafts(params: { status?: string }): Promise<OutreachDraft[]> {
    let list = [...read().drafts];
    if (params.status) {
      list = list.filter((d) => d.status === params.status);
    }
    list.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    return delay(list);
  },

  updateDraftBody(draftId: string, body: string): Promise<void> {
    const state = read();
    const draft = state.drafts.find((d) => d.id === draftId);
    if (!draft) return Promise.reject(new Error('Draft not found'));
    draft.body = body;
    draft.updatedAt = new Date().toISOString();
    write(state);
    return delay(undefined);
  },

  transitionDraft(
    draftId: string,
    toStatus: string,
    reason?: string,
    editedBody?: string,
  ): Promise<void> {
    const state = read();
    const draft = state.drafts.find((d) => d.id === draftId);
    if (!draft) return Promise.reject(new Error('Draft not found'));

    const allowed = DRAFT_LEGAL[draft.status] || [];
    if (!allowed.includes(toStatus)) {
      return Promise.reject(
        new Error(`Illegal draft transition: ${draft.status} → ${toStatus}`),
      );
    }

    if (editedBody !== undefined) {
      draft.body = editedBody;
    }
    draft.status = toStatus as OutreachDraft['status'];
    draft.updatedAt = new Date().toISOString();

    if (toStatus === 'approved' || toStatus === 'edited_approved') {
      journal(
        state,
        'outreach',
        'Outreach approved by a human',
        reason || 'Draft cleared review. Delivery is queued only because outreach consent is on.',
      );
      if (state.member.consent.outreach) {
        state.member.inbox.unshift({
          id: `in-${Date.now()}`,
          at: new Date().toISOString(),
          title: 'Care pathway note',
          body: draft.body,
          pathway: draft.pathwayId,
          status: 'delivered',
        });
      } else {
        journal(
          state,
          'privacy',
          'Delivery held',
          'Maya has outreach consent off. The approval is recorded; nothing is delivered.',
        );
      }
    }
    if (toStatus === 'rejected') {
      journal(
        state,
        'outreach',
        'Outreach rejected',
        reason || 'Matcher draft did not meet review bar. No contact.',
      );
    }

    write(state);
    return delay(undefined);
  },

  setScenario(scenario: ScenarioId) {
    const state = read();
    const slice = memberForScenario(scenario);
    state.member = { ...state.member, scenario, ...slice };
    journal(
      state,
      'system',
      `Scenario → ${scenario.replace(/_/g, ' ')}`,
      'Radar, listen outcomes, and briefing now share this synthetic trajectory.',
    );
    write(state);
  },

  toggleConsent(key: ConsentKey) {
    const state = read();
    state.member.consent[key] = !state.member.consent[key];
    const on = state.member.consent[key];
    if (key === 'acoustic' && !on) {
      state.member.nightWatch = false;
    }
    journal(
      state,
      'privacy',
      `${CONSENT_COPY[key].title} ${on ? 'on' : 'off'}`,
      on
        ? `Gates unlocked: ${CONSENT_COPY[key].gates}.`
        : `Gates locked: ${CONSENT_COPY[key].gates}. Existing aggregates stay K-anonymous.`,
    );
    write(state);
  },

  toggleNightWatch() {
    const state = read();
    if (!state.member.consent.acoustic) {
      throw new Error('Night Watch needs acoustic consent');
    }
    state.member.nightWatch = !state.member.nightWatch;
    journal(
      state,
      'member',
      state.member.nightWatch ? 'Night Watch armed' : 'Night Watch off',
      'Buffer remains ephemeral. A repeating pattern can emit a de-identified flag, never audio.',
    );
    write(state);
  },

  recordCheckIn(input: { rest: number; load: number; mood: number }): CheckIn {
    const state = read();
    const delta = Math.round((input.rest * 0.12 + input.mood * 0.1 - input.load * 0.08) * 10) / 10;
    const priAfter = Math.max(18, Math.min(96, Math.round(state.member.pri + delta)));
    const note =
      priAfter >= state.member.pri
        ? 'Check-in nudged the index upward. Advisory only — not a clinical score.'
        : 'Load outweighed rest. Radar will show a softer band tomorrow.';
    const row: CheckIn = {
      id: `ci-${Date.now()}`,
      at: new Date().toISOString(),
      ...input,
      priAfter,
      note,
    };
    state.member.pri = priAfter;
    state.member.priHistory = [...state.member.priHistory.slice(-13), priAfter];
    state.member.checkIns.unshift(row);
    journal(state, 'member', 'Daily check-in recorded', note);
    write(state);
    return row;
  },

  runListen(mode: ListenSession['mode']): ListenSession {
    const state = read();
    if (!state.member.consent.acoustic) {
      throw new Error('Acoustic consent is off');
    }

    const scenario = state.member.scenario;
    let outcome: ListenSession['outcome'] = 'discarded_calm';
    let signature: string | undefined;
    let confidence: number | undefined;
    let reviewId: string | undefined;

    const shouldFlag =
      (scenario === 'acute_deviation' && (mode === 'morning' || mode === 'ambient')) ||
      (scenario === 'night_watch' && mode === 'night') ||
      (scenario === 'gradual_decline' && mode === 'ambient' && state.member.sessions.length % 2 === 1);

    if (shouldFlag) {
      outcome = 'advisory_flag';
      signature =
        scenario === 'acute_deviation'
          ? 'distress_marker'
          : mode === 'night'
            ? 'vocal_tension_spike'
            : 'elevated_stress_pattern';
      confidence = scenario === 'acute_deviation' ? 0.89 : 0.74;
      reviewId = `rev-live-${Date.now()}`;
      const now = new Date().toISOString();
      state.reviews.unshift({
        id: reviewId,
        state: 'new',
        firstFlagAt: now,
        lastFlagAt: now,
        flagCount: 1,
        createdAt: now,
        escalatedToLead: false,
        flags: [
          {
            id: `flag-${reviewId}-1`,
            signature,
            confidence,
            timeBucket: now,
            modelVersion: 'edge-acoustic-0.3.1',
            createdAt: now,
          },
        ],
      });
      state.contacts[reviewId] = {
        subjectId: 'subj-demo-maya',
        emergencyContact: 'Wei Chen (demo)',
        emergencyPhone: '+1-555-0144',
      };
      journal(
        state,
        'system',
        'De-identified flag emitted',
        `Signature ${signature} (${Math.round((confidence || 0) * 100)}%). Audio destroyed. Desk queue has a new item.`,
      );
    } else {
      journal(
        state,
        'member',
        'Listen buffer destroyed',
        'No repeating pattern. Zero bytes retained. Nothing sent to review.',
      );
    }

    const session: ListenSession = {
      id: `ls-${Date.now()}`,
      at: new Date().toISOString(),
      mode,
      durationSec: mode === 'ambient' ? 30 : 12,
      outcome,
      signature,
      confidence,
      reviewId,
      audioDestroyed: true,
    };
    state.member.sessions.unshift(session);
    write(state);
    return session;
  },

  markInboxRead(id: string) {
    const state = read();
    const item = state.member.inbox.find((i) => i.id === id);
    if (item) item.status = 'read';
    write(state);
  },

  tick() {
    const state = read();
    if (!state.member.nightWatch) return;
    const last = state.member.priHistory[state.member.priHistory.length - 1] ?? state.member.pri;
    const next = Math.max(20, Math.min(94, last + (Math.random() > 0.5 ? 0.4 : -0.4)));
    state.member.priHistory = [...state.member.priHistory.slice(-13), Math.round(next)];
    write(state);
  },
};
