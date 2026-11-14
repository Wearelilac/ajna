import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { WearableService } from './wearable.service';
import { VaultService } from '../common/vault.service';
import { Pool } from 'pg';
import { ErrorCode } from '../common/errors';

describe('WearableService', () => {
  let service: WearableService;
  let vaultService: VaultService;
  let pool: Pool;

  const mockPool = {
    connect: jest.fn(),
    query: jest.fn(),
  };

  const mockVaultService = {
    encrypt: jest.fn(),
    decrypt: jest.fn(),
  };

  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WearableService,
        { provide: Pool, useValue: mockPool },
        { provide: VaultService, useValue: mockVaultService },
      ],
    }).compile();

    service = module.get<WearableService>(WearableService);
    vaultService = module.get<VaultService>(VaultService);
    pool = module.get<Pool>(Pool);

    // Reset mocks
    jest.clearAllMocks();
    mockPool.connect.mockResolvedValue(mockClient);
    mockClient.query.mockResolvedValue({ rows: [] });
  });

  describe('validateDate', () => {
    it('should reject future dates', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const input = {
        source: 'simulator',
        date: futureDateStr,
        metrics: {
          hrv_rmssd_ms: 50,
          resting_hr_bpm: 65,
          sleep_total_min: 480,
        },
      };

      await expect(
        service.storeDaily('subject-1', input, { subject_id: 'subject-1', role: 'user' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject dates older than 13 months', async () => {
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 14);
      const oldDateStr = oldDate.toISOString().split('T')[0];

      const input = {
        source: 'simulator',
        date: oldDateStr,
        metrics: {
          hrv_rmssd_ms: 50,
          resting_hr_bpm: 65,
          sleep_total_min: 480,
        },
      };

      await expect(
        service.storeDaily('subject-1', input, { subject_id: 'subject-1', role: 'user' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept valid date (today)', async () => {
      const today = new Date().toISOString().split('T')[0];

      const input = {
        source: 'simulator',
        date: today,
        metrics: {
          hrv_rmssd_ms: 50,
          resting_hr_bpm: 65,
          sleep_total_min: 480,
        },
      };

      mockVaultService.encrypt.mockResolvedValue({
        ciphertext: Buffer.from('encrypted'),
        nonce: Buffer.from('nonce'),
      });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // SET app.subject_id
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // SET app.role
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'test-id' }] }); // INSERT
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await service.storeDaily('subject-1', input, { subject_id: 'subject-1', role: 'user' });
      expect(result.date).toBe(today);
    });
  });

  describe('validateMetrics', () => {
    it('should reject payload with missing required fields', async () => {
      const today = new Date().toISOString().split('T')[0];

      const input = {
        source: 'simulator',
        date: today,
        metrics: {
          // Missing required fields
          hrv_rmssd_ms: null as any,
          resting_hr_bpm: 65,
          sleep_total_min: 480,
        },
      };

      await expect(
        service.storeDaily('subject-1', input, { subject_id: 'subject-1', role: 'user' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept payload with required fields only', async () => {
      const today = new Date().toISOString().split('T')[0];

      const input = {
        source: 'simulator',
        date: today,
        metrics: {
          hrv_rmssd_ms: 50,
          resting_hr_bpm: 65,
          sleep_total_min: 480,
        },
      };

      mockVaultService.encrypt.mockResolvedValue({
        ciphertext: Buffer.from('encrypted'),
        nonce: Buffer.from('nonce'),
      });
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // BEGIN
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // SET app.subject_id
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // SET app.role
      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 'test-id' }] }); // INSERT
      mockClient.query.mockResolvedValueOnce({ rows: [] }); // COMMIT

      const result = await service.storeDaily('subject-1', input, { subject_id: 'subject-1', role: 'user' });
      expect(result.id).toBe('test-id');
    });
  });

  describe('storeBatch', () => {
    it('should reject batch larger than 60 days', async () => {
      const days = Array.from({ length: 61 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return {
          source: 'simulator',
          date: date.toISOString().split('T')[0],
          metrics: {
            hrv_rmssd_ms: 50,
            resting_hr_bpm: 65,
            sleep_total_min: 480,
          },
        };
      });

      await expect(
        service.storeBatch('subject-1', days, { subject_id: 'subject-1', role: 'user' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept batch of 60 days', async () => {
      const days = Array.from({ length: 60 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return {
          source: 'simulator',
          date: date.toISOString().split('T')[0],
          metrics: {
            hrv_rmssd_ms: 50,
            resting_hr_bpm: 65,
            sleep_total_min: 480,
          },
        };
      });

      mockVaultService.encrypt.mockResolvedValue({
        ciphertext: Buffer.from('encrypted'),
        nonce: Buffer.from('nonce'),
      });
      mockClient.query.mockResolvedValue({ rows: [{ id: 'test-id' }] });

      const stored = await service.storeBatch('subject-1', days, { subject_id: 'subject-1', role: 'user' });
      expect(stored).toBe(60);
    });
  });

  describe('generateDemoSeed', () => {
    it('should generate 60 days of data (with ~5% missing)', async () => {
      process.env.AJNA_DEMO_MODE = 'true';

      mockVaultService.encrypt.mockResolvedValue({
        ciphertext: Buffer.from('encrypted'),
        nonce: Buffer.from('nonce'),
      });
      mockClient.query.mockResolvedValue({ rows: [{ id: 'test-id' }] });

      const daysGenerated = await service.generateDemoSeed('subject-1', 'steady', {
        subject_id: 'subject-1',
        role: 'user',
      });

      // Expect ~57 days (60 - 5% missing)
      expect(daysGenerated).toBeGreaterThanOrEqual(54);
      expect(daysGenerated).toBeLessThanOrEqual(60);
    });

    it('should reject in production mode', async () => {
      process.env.AJNA_ENV = 'production';
      process.env.AJNA_DEMO_MODE = 'false';

      await expect(
        service.generateDemoSeed('subject-1', 'steady', { subject_id: 'subject-1', role: 'user' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('encryption', () => {
    it('should encrypt metrics before storing', async () => {
      const today = new Date().toISOString().split('T')[0];

      const input = {
        source: 'simulator',
        date: today,
        metrics: {
          hrv_rmssd_ms: 50,
          resting_hr_bpm: 65,
          sleep_total_min: 480,
          sleep_deep_min: 120,
        },
      };

      mockVaultService.encrypt.mockResolvedValue({
        ciphertext: Buffer.from('encrypted-data'),
        nonce: Buffer.from('random-nonce'),
      });
      mockClient.query.mockResolvedValue({ rows: [{ id: 'test-id' }] });

      await service.storeDaily('subject-1', input, { subject_id: 'subject-1', role: 'user' });

      expect(mockVaultService.encrypt).toHaveBeenCalledWith(
        expect.stringContaining('"hrv_rmssd_ms":50'),
        'subject-1',
      );
    });
  });
});
