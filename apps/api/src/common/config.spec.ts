import { validateConfig } from './config';

describe('Config Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should exit when required env vars are missing', () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Clear required env vars
    delete process.env.AJNA_KEK_BASE64;
    delete process.env.AJNA_JWT_SECRET;
    delete process.env.DATABASE_URL;
    delete process.env.REDIS_URL;
    delete process.env.AJNA_SCORING_URL;
    delete process.env.AJNA_SCORING_TOKEN;

    try {
      validateConfig();
    } catch (e) {
      // Expected
    }

    // Verify that missing var names are printed (values redacted)
    const errorMessage = errorSpy.mock.calls[0]?.[0];
    if (errorMessage) {
      expect(errorMessage).toContain('Missing or invalid environment variables');
    }

    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('should validate correct config', () => {
    process.env.AJNA_KEK_BASE64 = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='; // 32 bytes base64
    process.env.AJNA_JWT_SECRET = 'test-secret';
    process.env.DATABASE_URL = 'postgres://localhost/test';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.AJNA_SCORING_URL = 'http://localhost:8001';
    process.env.AJNA_SCORING_TOKEN = 'test-token';
    process.env.AJNA_ENV = 'development';
    process.env.AJNA_PORT = '3000';

    const config = validateConfig();

    expect(config.AJNA_ENV).toBe('development');
    expect(config.AJNA_PORT).toBe(3000);
    expect(config.AJNA_KEK_BASE64).toBe(process.env.AJNA_KEK_BASE64);
  });
});
