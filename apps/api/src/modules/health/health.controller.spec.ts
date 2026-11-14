import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('getHealth', () => {
    it('should return healthy status', () => {
      const result = controller.getHealth();
      expect(result.status).toBe('healthy');
      expect(result.checks.database).toBe('ok');
      expect(result.checks.redis).toBe('ok');
    });

    it('should return valid ISO timestamp', () => {
      const result = controller.getHealth();
      expect(new Date(result.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('getReady', () => {
    it('should return ready status', () => {
      const result = controller.getReady();
      expect(result.ready).toBe(true);
      expect(result.checks.database).toBe(true);
      expect(result.checks.redis).toBe(true);
    });
  });
});
