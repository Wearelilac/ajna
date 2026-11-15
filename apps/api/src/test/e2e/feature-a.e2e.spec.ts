/**
 * W5.1: Feature A End-to-End Test
 * Full flow: ingest → baseline → PRI → radar
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

describe('Feature A: Wearable Resilience (E2E)', () => {
  let app: INestApplication;
  let subjectId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [], // Import AppModule
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('complete flow: ingest → baseline → PRI → radar', async () => {
    // 1. Create subject with consent
    const createSubjectResponse = await request(app.getHttpServer())
      .post('/v1/subjects')
      .send({
        age: 35,
        consentWearable: true,
      })
      .expect(201);

    subjectId = createSubjectResponse.body.id;
    expect(subjectId).toBeDefined();

    // 2. Ingest 30 days of wearable data
    const metrics = generateWearableData(30, 'stable');
    await request(app.getHttpServer())
      .post('/v1/wearable/batch')
      .send({ subjectId, days: metrics })
      .expect(201);

    // 3. Wait for baseline worker (simulate)
    // In production, this would be triggered by BullMQ
    await runBaselineWorker(subjectId, '2026-11-15');

    // 4. Verify baseline computed
    const baselineResponse = await request(app.getHttpServer())
      .get(`/v1/subjects/${subjectId}/baseline`)
      .expect(200);

    expect(baselineResponse.body.metrics).toContain('hrv_rmssd_ms');
    expect(baselineResponse.body.n_valid_days).toBeGreaterThanOrEqual(14);

    // 5. Verify PRI computed
    const priResponse = await request(app.getHttpServer())
      .get(`/v1/subjects/${subjectId}/pri`)
      .expect(200);

    expect(priResponse.body.pri).toBeGreaterThan(0);
    expect(priResponse.body.pri).toBeLessThanOrEqual(100);

    // 6. Verify radar data (mobile API)
    const radarResponse = await request(app.getHttpServer())
      .get(`/v1/subjects/${subjectId}/radar`)
      .expect(200);

    expect(radarResponse.body.pri).toBeDefined();
    expect(radarResponse.body.flags).toBeInstanceOf(Array);
    expect(radarResponse.body.flags.length).toBe(0); // Stable profile, no flags
    expect(radarResponse.body.metrics).toBeDefined();
  });
});

function generateWearableData(days: number, profile: string) {
  const data = [];
  for (let i = 0; i < days; i++) {
    data.push({
      date: `2026-10-${15 + i}`,
      hrv_rmssd_ms: profile === 'stable' ? 50 + Math.random() * 10 : 30 + Math.random() * 20,
      resting_hr_bpm: profile === 'stable' ? 65 + Math.random() * 5 : 75 + Math.random() * 10,
      sleep_total_min: profile === 'stable' ? 450 + Math.random() * 30 : 360 + Math.random() * 60,
      sleep_efficiency: profile === 'stable' ? 0.85 + Math.random() * 0.1 : 0.70 + Math.random() * 0.15,
      activity_recovery_ratio: profile === 'stable' ? 1.2 + Math.random() * 0.2 : 0.8 + Math.random() * 0.3,
    });
  }
  return data;
}

async function runBaselineWorker(subjectId: string, date: string) {
  // Simulate worker execution
  // In production, this would be handled by BullMQ
  await new Promise(resolve => setTimeout(resolve, 100));
}
