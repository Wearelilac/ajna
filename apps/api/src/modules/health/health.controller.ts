import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiOkResponse, ApiServiceUnavailableResponse } from '@nestjs/swagger';
import { z } from 'zod';
import { ZodDto } from '@nestjs/zod';

export const HealthResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded']),
  timestamp: z.string().datetime(),
  checks: z.object({
    database: z.enum(['ok', 'degraded', 'unavailable']),
    redis: z.enum(['ok', 'degraded', 'unavailable']),
  }),
});

export class HealthResponseDto extends ZodDto(HealthResponseSchema) {}

export const ReadinessResponseSchema = z.object({
  ready: z.boolean(),
  checks: z.object({
    database: z.boolean(),
    redis: z.boolean(),
  }),
});

export class ReadinessResponseDto extends ZodDto(ReadinessResponseSchema) {}

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
  getReady(): ReadinessResponseDto {
    // TODO: After B1.2, add actual DB and Redis connectivity checks
    return {
      ready: true,
      checks: {
        database: true,
        redis: true,
      },
    } as ReadinessResponseDto;
  }
}
