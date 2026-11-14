import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../app.module';
import { AppExceptionFilter } from './exception-filter';

describe('AppExceptionFilter - Error Shape', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.useGlobalFilters(new AppExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const testErrorShape = async (path: string, expectedStatus: number, expectedCode: string) => {
    const response = await app.inject({
      method: 'GET',
      url: path,
    });

    expect(response.statusCode).toBe(expectedStatus);
    const body = JSON.parse(response.body);

    // Standard error shape from 00-stack-and-conventions.md, section 4
    expect(body).toHaveProperty('statusCode');
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('code');
    expect(body).toHaveProperty('message');
    expect(body).toHaveProperty('requestId');

    expect(body.statusCode).toBe(expectedStatus);
    expect(body.code).toBe(expectedCode);

    // Request ID should be a valid UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(body.requestId)).toBe(true);
  };

  describe('Error shape consistency', () => {
    it('404 error should have standard shape', async () => {
      await testErrorShape('/nonexistent', 404, 'NOT_FOUND');
    });

    it('health endpoint should return standard response', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/health',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['x-request-id']).toBeDefined();

      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(response.headers['x-request-id'])).toBe(true);
    });
  });

  describe('Request ID handling', () => {
    it('should accept valid x-request-id header', async () => {
      const validId = '12345678-1234-5678-1234-567812345678';
      const response = await app.inject({
        method: 'GET',
        url: '/v1/health',
        headers: {
          'x-request-id': validId,
        },
      });

      expect(response.headers['x-request-id']).toBe(validId);
    });

    it('should reject invalid x-request-id and generate new one', async () => {
      const invalidId = 'not-a-uuid';
      const response = await app.inject({
        method: 'GET',
        url: '/v1/health',
        headers: {
          'x-request-id': invalidId,
        },
      });

      const newId = response.headers['x-request-id'];
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(newId as string)).toBe(true);
      expect(newId).not.toBe(invalidId);
    });
  });
});
