import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiOkResponse, ApiServiceUnavailableResponse } from '@nestjs/swagger';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const HealthResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded']),
  timestamp: z.string().datetime(),
  checks: z.object({
    database: z.enum(['ok', 'degraded', 'unavailable']),
    redis: z.enum(['ok', 'degraded', 'unavailable']),
  }),
});

export class HealthResponseDto extends createZodDto(HealthResponseSchema) {}

export const ReadinessResponseSchema = z.object({
  ready: z.boolean(),
  checks: z.object({
    database: z.boolean(),
    redis: z.boolean(),
  }),
});

export class ReadinessResponseDto extends createZodDto(ReadinessResponseSchema) {}

@Controller('v1')
export class HealthController {
  /**
   * Liveness probe: fast, always responds unless service is crashed.
   * GET /v1/health
   */
  @Get('health')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiOkResponse({
    description: 'Service is alive',
    type: HealthResponseDto,
  })
  getHealth(): HealthResponseDto {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'ok',
        redis: 'ok',
      },
    } as HealthResponseDto;
  }

  /**
   * Readiness probe: checks DB and Redis connectivity.
   * Returns degraded flags, never crashes.
   * GET /v1/ready
   */
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  @ApiOkResponse({
    description: 'Service readiness status',
    type: ReadinessResponseDto,
  })
  @ApiServiceUnavailableResponse({ description: 'Service not ready' })
  async getReady(): Promise<ReadinessResponseDto> {
    let dbReady = false;
    let redisReady = false;

    // TODO: After B1.2, integrate actual database service
    // For now, assume connected during development
    dbReady = true;

    // TODO: After B1.4, integrate actual Redis/BullMQ
    // For now, assume connected during development
    redisReady = true;

    return {
      ready: dbReady && redisReady,
      checks: {
        database: dbReady,
        redis: redisReady,
      },
    } as ReadinessResponseDto;
  }
}
