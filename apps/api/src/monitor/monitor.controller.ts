/**
 * B3.1: Monitor and flag endpoints
 * POST /v1/monitor/sessions (start session)
 * POST /v1/monitor/sessions/:id/end (end session)
 * POST /v1/monitor/flags (store de-identified flag)
 * GET /v1/monitor/sessions/active (get active session)
 */

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { MonitorService } from './monitor.service';
import { CrisisService } from './crisis.service';
import {
  MonitorSessionDto,
  EndMonitorSessionDto,
  DeIdentifiedFlagInputDto,
  DeIdentifiedFlagDto,
} from './dto/monitor.dto';
import { AppError, ERROR_CODES } from '../common/errors';
import { LIMITS } from '../common/limits';

@Controller('v1/monitor')
export class MonitorController {
  constructor(
    private readonly monitorService: MonitorService,
    private readonly crisisService: CrisisService,
  ) {}

  /**
   * POST /v1/monitor/sessions
   * Start a new monitor session
   * Requires: monitor_me consent (checked by AuthGuard)
   */
  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  async startSession(@Request() req: any): Promise<MonitorSessionDto> {
    const subjectId = req.user?.subjectId;
    if (!subjectId) {
      throw new AppError(401, ERROR_CODES.UNAUTHORIZED, 'Unauthorized');
    }

    // TODO: Check monitor_me consent (from ConsentGuard)
    // For now, assume consent is checked by AuthGuard

    return await this.monitorService.startSession(subjectId);
  }

  /**
   * POST /v1/monitor/sessions/:id/end
   * End a monitor session
   */
  @Post('sessions/:id/end')
  @HttpCode(HttpStatus.OK)
  async endSession(
    @Param('id') sessionId: string,
    @Body() dto: EndMonitorSessionDto,
    @Request() req: any,
  ): Promise<MonitorSessionDto> {
    const subjectId = req.user?.subjectId;
    if (!subjectId) {
      throw new AppError(401, ERROR_CODES.UNAUTHORIZED, 'Unauthorized');
    }

    return await this.monitorService.endSession(sessionId, subjectId, dto);
  }

  /**
   * GET /v1/monitor/sessions/active
   * Get active monitor session for current user
   */
  @Get('sessions/active')
  async getActiveSession(@Request() req: any): Promise<MonitorSessionDto | null> {
    const subjectId = req.user?.subjectId;
    if (!subjectId) {
      throw new AppError(401, ERROR_CODES.UNAUTHORIZED, 'Unauthorized');
    }

    return await this.monitorService.getActiveSession(subjectId);
  }

  /**
   * POST /v1/monitor/flags
   * Store a de-identified flag (7-field allow-list ONLY)
   * Rejects unknown fields with FLAG_FIELD_NOT_ALLOWED
   */
  @Post('flags')
  @HttpCode(HttpStatus.CREATED)
  async storeFlag(
    @Body() dto: DeIdentifiedFlagInputDto,
    @Request() req: any,
  ): Promise<DeIdentifiedFlagDto> {
    const subjectId = req.user?.subjectId;
    if (!subjectId) {
      throw new AppError(401, ERROR_CODES.UNAUTHORIZED, 'Unauthorized');
    }

    // Explicit allow-list check (class-validator handles field validation)
    const allowedFields = [
      'sessionId',
      'signature',
      'confidence',
      'timeBucket',
      'modelVersion',
      'sessionDurationSec',
      'energyDb',
    ];

    const receivedFields = Object.keys(dto);
    const unknownFields = receivedFields.filter((f) => !allowedFields.includes(f));

    if (unknownFields.length > 0) {
      throw new AppError(
        422,
        ERROR_CODES.FLAG_FIELD_NOT_ALLOWED,
        `Unknown fields: ${unknownFields.join(', ')}`,
      );
    }

    // Check rate limit: max flags per session
    // TODO: Implement rate limiter (Redis-based)

    // Store flag
    const flag = await this.monitorService.storeFlag(subjectId, dto);

    // Check if this flag should trigger a crisis review
    // For now, only distress_signature with confidence >= threshold
    if (
      dto.signature === 'distress_signature' &&
      dto.confidence >= LIMITS.ACOUSTIC.CONFIDENCE_THRESHOLD
    ) {
      await this.crisisService.createOrUpdateReview(
        subjectId,
        flag.id,
        dto.signature,
        dto.confidence,
      );
    }

    return flag;
  }
}
