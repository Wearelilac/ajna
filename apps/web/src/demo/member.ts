export type ScenarioId =
  | 'steady'
  | 'gradual_decline'
  | 'acute_deviation'
  | 'night_watch';

export type ConsentKey = 'wearable' | 'acoustic' | 'population' | 'outreach';

export interface WearableMetric {
  id: string;
  label: string;
  unit: string;
  value: number;
  baseline: number;
  bandLow: number;
  bandHigh: number;
  hint: string;
}

export interface DeviationFlag {
  id: string;
  metricId: string;
  direction: 'above' | 'below';
  delta: string;
  advisory: string;
}

export interface CheckIn {
  id: string;
  at: string;
  rest: number;
  load: number;
  mood: number;
  priAfter: number;
  note: string;
}

export interface ListenSession {
  id: string;
  at: string;
  mode: 'morning' | 'ambient' | 'night';
  durationSec: number;
  outcome: 'discarded_calm' | 'advisory_flag';
  signature?: string;
  confidence?: number;
  reviewId?: string;
  audioDestroyed: true;
}

export interface InboxItem {
  id: string;
  at: string;
  title: string;
  body: string;
  pathway: string;
  status: 'delivered' | 'read';
}

export interface JournalEntry {
  id: string;
  at: string;
  kind: 'system' | 'member' | 'reviewer' | 'outreach' | 'privacy';
  title: string;
  detail: string;
}

export interface MemberState {
  name: string;
  handle: string;
  communityId: string;
  communityName: string;
  scenario: ScenarioId;
  pri: number;
  priHistory: number[];
  nightWatch: boolean;
  consent: Record<ConsentKey, boolean>;
  metrics: WearableMetric[];
  deviations: DeviationFlag[];
  checkIns: CheckIn[];
  sessions: ListenSession[];
  inbox: InboxItem[];
  journal: JournalEntry[];
}

const ADVISORY =
  'This is an advisory indicator for human review, not a diagnosis. Consider rest, hydration, and talking with your usual care provider if you feel unwell.';

function series(seed: number[], jitter = 0): number[] {
  return seed.map((n, i) => Math.max(18, Math.min(96, n + ((i % 5) - 2) * jitter)));
}

export function memberForScenario(scenario: ScenarioId): Pick<
  MemberState,
  'pri' | 'priHistory' | 'metrics' | 'deviations' | 'nightWatch'
> {
  const metrics = (
    hrv: number,
    rhr: number,
    sleep: number,
    temp: number,
    activity: number,
  ): WearableMetric[] => [
    {
      id: 'hrv',
      label: 'HRV (rMSSD)',
      unit: 'ms',
      value: hrv,
      baseline: 48,
      bandLow: 36,
      bandHigh: 60,
      hint: 'Heart-rate variability versus your 30-day band.',
    },
    {
      id: 'rhr',
      label: 'Resting heart rate',
      unit: 'bpm',
      value: rhr,
      baseline: 61,
      bandLow: 55,
      bandHigh: 68,
      hint: 'Morning resting rate versus usual.',
    },
    {
      id: 'sleep',
      label: 'Sleep architecture',
      unit: 'score',
      value: sleep,
      baseline: 74,
      bandLow: 62,
      bandHigh: 86,
      hint: 'Deep + REM share compared with your baseline.',
    },
    {
      id: 'temp',
      label: 'Skin temp Δ',
      unit: '°C',
      value: temp,
      baseline: 0.1,
      bandLow: -0.4,
      bandHigh: 0.5,
      hint: 'Nightly skin-temperature deviation.',
    },
    {
      id: 'activity',
      label: 'Activity recovery',
      unit: '%',
      value: activity,
      baseline: 71,
      bandLow: 55,
      bandHigh: 88,
      hint: 'Load versus recovery over 7 days.',
    },
  ];

  if (scenario === 'steady') {
    return {
      pri: 78,
      priHistory: series([72, 74, 73, 75, 76, 77, 75, 78, 79, 77, 78, 80, 79, 78], 0.2),
      metrics: metrics(51, 59, 76, 0.08, 74),
      deviations: [],
      nightWatch: false,
    };
  }
  if (scenario === 'gradual_decline') {
    return {
      pri: 61,
      priHistory: series([78, 76, 74, 72, 70, 69, 67, 66, 65, 64, 63, 62, 61, 61], 0.15),
      metrics: metrics(34, 67, 58, 0.42, 52),
      deviations: [
        {
          id: 'dev-hrv',
          metricId: 'hrv',
          direction: 'below',
          delta: '−2.1 SD from usual',
          advisory: ADVISORY,
        },
        {
          id: 'dev-sleep',
          metricId: 'sleep',
          direction: 'below',
          delta: '−1.8 SD from usual',
          advisory: ADVISORY,
        },
      ],
      nightWatch: false,
    };
  }
  if (scenario === 'night_watch') {
    return {
      pri: 69,
      priHistory: series([70, 71, 68, 69, 72, 70, 67, 69, 71, 68, 70, 69, 68, 69], 0.25),
      metrics: metrics(44, 63, 70, 0.18, 66),
      deviations: [
        {
          id: 'dev-temp',
          metricId: 'temp',
          direction: 'above',
          delta: '+0.9 SD overnight',
          advisory: ADVISORY,
        },
      ],
      nightWatch: true,
    };
  }
  return {
    pri: 44,
    priHistory: series([76, 74, 71, 68, 64, 60, 58, 55, 52, 49, 47, 45, 44, 44], 0.2),
    metrics: metrics(27, 74, 49, 0.61, 41),
    deviations: [
      {
        id: 'dev-hrv-acute',
        metricId: 'hrv',
        direction: 'below',
        delta: '−3.4 SD from usual',
        advisory: ADVISORY,
      },
      {
        id: 'dev-rhr',
        metricId: 'rhr',
        direction: 'above',
        delta: '+2.7 SD from usual',
        advisory: ADVISORY,
      },
      {
        id: 'dev-sleep-acute',
        metricId: 'sleep',
        direction: 'below',
        delta: '−2.9 SD from usual',
        advisory: ADVISORY,
      },
    ],
    nightWatch: false,
  };
}

export function createInitialMember(): MemberState {
  const scenario: ScenarioId = 'gradual_decline';
  const slice = memberForScenario(scenario);
  return {
    name: 'Maya Chen',
    handle: 'maya.demo',
    communityId: 'c-bayview',
    communityName: 'Bayview Heights',
    scenario,
    consent: {
      wearable: true,
      acoustic: true,
      population: true,
      outreach: true,
    },
    checkIns: [],
    sessions: [],
    inbox: [],
    journal: [
      {
        id: 'j-boot',
        at: new Date().toISOString(),
        kind: 'system',
        title: 'Prototype session started',
        detail:
          'Synthetic member Maya Chen in Bayview Heights. No real health data. Audio never persisted.',
      },
    ],
    ...slice,
  };
}

export const SCENARIO_COPY: Record<
  ScenarioId,
  { title: string; blurb: string }
> = {
  steady: {
    title: 'Steady baseline',
    blurb: 'Fourteen quiet days. Radar stays inside the band. Listen sessions dissolve.',
  },
  gradual_decline: {
    title: 'Gradual decline',
    blurb: 'Sleep and HRV drift for two weeks. Care-gap and briefing start to notice.',
  },
  acute_deviation: {
    title: 'Acute deviation',
    blurb: 'A sharp overnight shift. Listen can emit a de-identified flag for human review.',
  },
  night_watch: {
    title: 'Night watch',
    blurb: 'Ephemeral buffer on. Ambient ticks stay on-device unless a pattern repeats.',
  },
};

export const CONSENT_COPY: Record<
  ConsentKey,
  { title: string; body: string; gates: string }
> = {
  wearable: {
    title: 'Wearable baseline',
    body: 'Daily HRV, rest, sleep, and temperature bands stay on-device until you opt in to sync aggregates.',
    gates: 'Radar and Personal Resilience Index',
  },
  acoustic: {
    title: 'On-device listen',
    body: 'A rolling buffer is scored locally and then destroyed. Raw audio never leaves the phone.',
    gates: 'Listen and Night Watch',
  },
  population: {
    title: 'Population aggregates',
    body: 'Only K-anonymous community counts (K≥10) may be contributed. You are never a row.',
    gates: 'Community contribution in Desk → Pulse',
  },
  outreach: {
    title: 'Care-gap messages',
    body: 'Drafts are written by a matcher, then a human must approve before anything reaches your inbox.',
    gates: 'Member inbox delivery',
  },
};
