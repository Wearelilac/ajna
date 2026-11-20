/**
 * Synthetic demo dataset for the shareable prototype.
 * No real people, no real health data.
 */

import type { Community, Cluster, PopulationOverview } from '@/features/population/types';
import type {
  CrisisReview,
  CrisisReviewEvent,
  DeIdentifiedFlagSummary,
} from '@/features/crisis-reviews/types';
import type { OutreachDraft } from '@/features/caregap/types';

const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString();

export const DEMO_USER = {
  id: 'reviewer-demo-001',
  email: 'reviewer@demo.ajna.invalid',
  role: 'admin',
};

export const DEMO_OVERVIEW: PopulationOverview = {
  totalCommunities: 12,
  totalSubjects: 4820,
  totalFlags: 318,
  avgPri: 64,
  latestWeek: '2026-W46',
};

export const DEMO_COMMUNITIES: Community[] = [
  {
    communityId: 'c-bayview',
    name: 'Bayview Heights',
    regionCode: 'US-CA',
    deprivationIndex: 0.72,
    populationEstimate: 18400,
    latestMonth: '2026-10',
    subjectsN: 420,
    flagCount: 48,
    meanPri: 51,
    deviationShare: 0.18,
    suppressed: false,
  },
  {
    communityId: 'c-mission',
    name: 'Mission Creek',
    regionCode: 'US-CA',
    deprivationIndex: 0.55,
    populationEstimate: 22100,
    latestMonth: '2026-10',
    subjectsN: 510,
    flagCount: 31,
    meanPri: 62,
    deviationShare: 0.11,
    suppressed: false,
  },
  {
    communityId: 'c-oakridge',
    name: 'Oakridge',
    regionCode: 'US-CA',
    deprivationIndex: 0.28,
    populationEstimate: 9800,
    latestMonth: '2026-10',
    subjectsN: 8,
    flagCount: null,
    meanPri: null,
    deviationShare: null,
    suppressed: true,
  },
  {
    communityId: 'c-eastside',
    name: 'Eastside Corridor',
    regionCode: 'US-TX',
    deprivationIndex: 0.81,
    populationEstimate: 31200,
    latestMonth: '2026-10',
    subjectsN: 680,
    flagCount: 92,
    meanPri: 44,
    deviationShare: 0.24,
    suppressed: false,
  },
  {
    communityId: 'c-riverside',
    name: 'Riverside',
    regionCode: 'US-TX',
    deprivationIndex: 0.46,
    populationEstimate: 15600,
    latestMonth: '2026-10',
    subjectsN: 290,
    flagCount: 19,
    meanPri: 68,
    deviationShare: 0.08,
    suppressed: false,
  },
  {
    communityId: 'c-midtown',
    name: 'Midtown North',
    regionCode: 'US-NY',
    deprivationIndex: 0.39,
    populationEstimate: 27400,
    latestMonth: '2026-10',
    subjectsN: 540,
    flagCount: 27,
    meanPri: 71,
    deviationShare: 0.07,
    suppressed: false,
  },
  {
    communityId: 'c-bronx-south',
    name: 'South Bronx Edge',
    regionCode: 'US-NY',
    deprivationIndex: 0.76,
    populationEstimate: 19800,
    latestMonth: '2026-10',
    subjectsN: 390,
    flagCount: 55,
    meanPri: 48,
    deviationShare: 0.21,
    suppressed: false,
  },
  {
    communityId: 'c-little-harbor',
    name: 'Little Harbor',
    regionCode: 'US-FL',
    deprivationIndex: 0.63,
    populationEstimate: 11200,
    latestMonth: '2026-10',
    subjectsN: 210,
    flagCount: 22,
    meanPri: 57,
    deviationShare: 0.14,
    suppressed: false,
  },
  {
    communityId: 'c-palm-grove',
    name: 'Palm Grove',
    regionCode: 'US-FL',
    deprivationIndex: 0.34,
    populationEstimate: 8700,
    latestMonth: '2026-10',
    subjectsN: 6,
    flagCount: null,
    meanPri: null,
    deviationShare: null,
    suppressed: true,
  },
  {
    communityId: 'c-lakewood',
    name: 'Lakewood',
    regionCode: 'US-FL',
    deprivationIndex: 0.42,
    populationEstimate: 14300,
    latestMonth: '2026-10',
    subjectsN: 260,
    flagCount: 14,
    meanPri: 69,
    deviationShare: 0.06,
    suppressed: false,
  },
  {
    communityId: 'c-harborview',
    name: 'Harborview',
    regionCode: 'US-CA',
    deprivationIndex: 0.58,
    populationEstimate: 16500,
    latestMonth: '2026-10',
    subjectsN: 310,
    flagCount: 25,
    meanPri: 59,
    deviationShare: 0.12,
    suppressed: false,
  },
  {
    communityId: 'c-cedar',
    name: 'Cedar Flats',
    regionCode: 'US-TX',
    deprivationIndex: 0.21,
    populationEstimate: 7200,
    latestMonth: '2026-10',
    subjectsN: 9,
    flagCount: null,
    meanPri: null,
    deviationShare: null,
    suppressed: true,
  },
];

export const DEMO_CLUSTERS: Cluster[] = [
  {
    clusterId: 1,
    label: 'High deprivation + elevated deviation share',
    score: 84,
    scoreBreakdown: {
      deprivation: 78,
      pri: 46,
      deviation_share: 22,
      flag_rate: 18,
    },
    communities: ['c-eastside', 'c-bronx-south', 'c-bayview'],
  },
  {
    clusterId: 2,
    label: 'Moderate risk with care-gap concentration',
    score: 58,
    scoreBreakdown: {
      deprivation: 55,
      pri: 58,
      deviation_share: 12,
      flag_rate: 9,
    },
    communities: ['c-mission', 'c-little-harbor', 'c-harborview'],
  },
  {
    clusterId: 3,
    label: 'Stable resilience baseline',
    score: 28,
    scoreBreakdown: {
      deprivation: 32,
      pri: 70,
      deviation_share: 6,
      flag_rate: 4,
    },
    communities: ['c-midtown', 'c-riverside', 'c-lakewood'],
  },
];

function flagsFor(reviewId: string, signatures: Array<[string, number, number]>): DeIdentifiedFlagSummary[] {
  return signatures.map(([signature, confidence, hours], i) => ({
    id: `flag-${reviewId}-${i + 1}`,
    signature,
    confidence,
    timeBucket: hoursAgo(hours),
    modelVersion: 'edge-acoustic-0.3.1',
    createdAt: hoursAgo(hours),
  }));
}

export function createInitialReviews(): CrisisReview[] {
  return [
    {
      id: 'rev-1001-aaaa-bbbb-cccc0001',
      state: 'new',
      firstFlagAt: hoursAgo(2.5),
      lastFlagAt: hoursAgo(0.8),
      flagCount: 3,
      createdAt: hoursAgo(2.5),
      escalatedToLead: false,
      flags: flagsFor('rev-1001', [
        ['vocal_tension_spike', 0.86, 2.5],
        ['elevated_stress_pattern', 0.79, 1.4],
        ['vocal_tension_spike', 0.91, 0.8],
      ]),
    },
    {
      id: 'rev-1002-aaaa-bbbb-cccc0002',
      state: 'assigned',
      ownerId: DEMO_USER.id,
      firstFlagAt: hoursAgo(8),
      lastFlagAt: hoursAgo(5),
      flagCount: 2,
      createdAt: hoursAgo(8),
      assignedAt: hoursAgo(6),
      escalatedToLead: false,
      flags: flagsFor('rev-1002', [
        ['rapid_speech_burst', 0.74, 8],
        ['elevated_stress_pattern', 0.81, 5],
      ]),
    },
    {
      id: 'rev-1003-aaaa-bbbb-cccc0003',
      state: 'in_review',
      ownerId: DEMO_USER.id,
      firstFlagAt: hoursAgo(20),
      lastFlagAt: hoursAgo(12),
      flagCount: 4,
      createdAt: hoursAgo(20),
      assignedAt: hoursAgo(18),
      escalatedToLead: true,
      flags: flagsFor('rev-1003', [
        ['distress_marker', 0.88, 20],
        ['vocal_tension_spike', 0.83, 17],
        ['distress_marker', 0.9, 14],
        ['elevated_stress_pattern', 0.77, 12],
      ]),
    },
    {
      id: 'rev-1004-aaaa-bbbb-cccc0004',
      state: 'new',
      firstFlagAt: hoursAgo(0.4),
      lastFlagAt: hoursAgo(0.4),
      flagCount: 1,
      createdAt: hoursAgo(0.4),
      escalatedToLead: false,
      flags: flagsFor('rev-1004', [['rapid_speech_burst', 0.72, 0.4]]),
    },
    {
      id: 'rev-1005-aaaa-bbbb-cccc0005',
      state: 'closed',
      ownerId: DEMO_USER.id,
      outcome: 'routine_follow_up_requested',
      firstFlagAt: daysAgo(2),
      lastFlagAt: daysAgo(2),
      flagCount: 2,
      createdAt: daysAgo(2),
      assignedAt: daysAgo(2),
      closedAt: daysAgo(1),
      escalatedToLead: false,
      flags: flagsFor('rev-1005', [
        ['elevated_stress_pattern', 0.7, 48],
        ['vocal_tension_spike', 0.68, 46],
      ]),
    },
  ];
}

export function createInitialEvents(): CrisisReviewEvent[] {
  return [
    {
      id: 'evt-1',
      reviewId: 'rev-1002-aaaa-bbbb-cccc0002',
      fromState: 'new',
      toState: 'assigned',
      actorId: DEMO_USER.id,
      reason: 'Picked up from queue',
      at: hoursAgo(6),
    },
    {
      id: 'evt-2',
      reviewId: 'rev-1003-aaaa-bbbb-cccc0003',
      fromState: 'new',
      toState: 'assigned',
      actorId: DEMO_USER.id,
      at: hoursAgo(18),
    },
    {
      id: 'evt-3',
      reviewId: 'rev-1003-aaaa-bbbb-cccc0003',
      fromState: 'assigned',
      toState: 'in_review',
      actorId: DEMO_USER.id,
      reason: 'Pattern warrants closer look',
      at: hoursAgo(16),
    },
    {
      id: 'evt-4',
      reviewId: 'rev-1005-aaaa-bbbb-cccc0005',
      fromState: 'in_review',
      toState: 'closed',
      actorId: DEMO_USER.id,
      reason: 'Routine follow-up documented; no emergency indicators',
      at: daysAgo(1),
    },
  ];
}

export function createInitialDrafts(): OutreachDraft[] {
  return [
    {
      id: 'draft-2001-aaaa-bbbb-0001',
      careGapId: 'gap-wcv-001',
      pathwayId: 'path-well-child',
      body: `Hello,

Our records suggest a Well-Child Visit may be overdue. This is a friendly reminder that preventive visits help catch concerns early.

If you would like help scheduling, reply to this message or call your clinic.

— Care Coordination Team
(This message was reviewed by a human before approval. No automated contact.)`,
      language: 'en',
      readingLevel: 'grade_6',
      status: 'draft',
      generatedBy: 'caregap-matcher-v1',
      createdAt: hoursAgo(10),
      updatedAt: hoursAgo(10),
    },
    {
      id: 'draft-2002-aaaa-bbbb-0002',
      careGapId: 'gap-bp-002',
      pathwayId: 'path-bp-screen',
      body: `Hello,

You may be due for a blood pressure check. Screening is quick and can help your care team support you sooner if needed.

Would you like us to share nearby clinic options?

— Outreach Review Desk`,
      language: 'en',
      readingLevel: 'grade_6',
      status: 'in_review',
      generatedBy: 'caregap-matcher-v1',
      createdAt: hoursAgo(30),
      updatedAt: hoursAgo(4),
    },
    {
      id: 'draft-2003-aaaa-bbbb-0003',
      careGapId: 'gap-mh-003',
      pathwayId: 'path-mh-screen',
      body: `Hello,

A wellness check-in may be helpful based on community care pathways. This is optional and not a diagnosis.

If you want support connecting with a counselor or primary care, we can share options after review.

— Care Coordination Team`,
      language: 'en',
      readingLevel: 'grade_7',
      status: 'approved',
      generatedBy: 'caregap-matcher-v1',
      createdAt: daysAgo(3),
      updatedAt: daysAgo(2),
    },
    {
      id: 'draft-2004-aaaa-bbbb-0004',
      careGapId: 'gap-imm-004',
      pathwayId: 'path-immunization',
      body: `Hello,

Immunization records may show an upcoming or overdue item. Please check with your clinic if you are unsure.

We can help with appointment info if useful.

— Outreach Review Desk`,
      language: 'en',
      readingLevel: 'grade_6',
      status: 'rejected',
      generatedBy: 'caregap-matcher-v1',
      createdAt: daysAgo(4),
      updatedAt: daysAgo(3),
    },
  ];
}

export const DEMO_CONTACTS: Record<
  string,
  { subjectId: string; emergencyContact: string; emergencyPhone: string }
> = {
  'rev-1001-aaaa-bbbb-cccc0001': {
    subjectId: 'subj-demo-7f3a',
    emergencyContact: 'Jordan Lee (demo)',
    emergencyPhone: '+1-555-0101',
  },
  'rev-1002-aaaa-bbbb-cccc0002': {
    subjectId: 'subj-demo-9c21',
    emergencyContact: 'Alex Rivera (demo)',
    emergencyPhone: '+1-555-0102',
  },
  'rev-1003-aaaa-bbbb-cccc0003': {
    subjectId: 'subj-demo-4b88',
    emergencyContact: 'Sam Patel (demo)',
    emergencyPhone: '+1-555-0103',
  },
  'rev-1004-aaaa-bbbb-cccc0004': {
    subjectId: 'subj-demo-1e55',
    emergencyContact: 'Casey Ng (demo)',
    emergencyPhone: '+1-555-0104',
  },
  'rev-1005-aaaa-bbbb-cccc0005': {
    subjectId: 'subj-demo-2d90',
    emergencyContact: 'Riley Chen (demo)',
    emergencyPhone: '+1-555-0105',
  },
};
