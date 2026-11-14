import { Controller, Post, Get, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { WearableService } from './wearable.service';
import { AuthGuard } from '../auth/auth.guard';
import { RequiresConsent } from '../auth/requires-consent.decorator';
import {
  WearableDailyInputDto,
  WearableDailyBatchInputDto,
  DemoSeedInputDto,
} from './dto/wearable-daily-input.dto';
import {
  WearableDailyResponseDto,
  WearableDailyBatchResponseDto,
  WearableDailyDto,
  DemoSeedResponseDto,
} from './dto/wearable-daily-output.dto';

@ApiTags('wearable')
@Controller('v1/wearable')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class WearableController {
  constructor(private readonly wearableService: WearableService) {}

  /**
   * POST /v1/wearable/daily
   * Store a single day of wearable metrics
   */
  @Post('daily')
  @RequiresConsent('wearable')
  @ApiOperation({ summary: 'Store daily wearable metrics', description: 'Submit a single day of wearable metrics. Requires wearable consent.' })
  @ApiResponse({ status: 201, description: 'Metrics received', type: WearableDailyResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid payload or missing consent' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async storeDaily(@Req() req: any, @Body() input: WearableDailyInputDto): Promise<WearableDailyResponseDto> {
    const subjectId = req.user.subject_id;
    const rlsContext = { subject_id: subjectId, role: 'user' };

    const result = await this.wearableService.storeDaily(subjectId, input, rlsContext);

    return {
      id: result.id,
      message: 'Metrics received',
      date: result.date,
    };
  }

  /**
   * POST /v1/wearable/daily/batch
   * Store multiple days of wearable metrics (max 60)
   */
  @Post('daily/batch')
  @RequiresConsent('wearable')
  @ApiOperation({ summary: 'Store batch of daily wearable metrics', description: 'Submit up to 60 days of wearable metrics. Requires wearable consent.' })
  @ApiResponse({ status: 201, description: 'Batch received', type: WearableDailyBatchResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid payload, batch too large, or missing consent' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async storeBatch(@Req() req: any, @Body() input: WearableDailyBatchInputDto): Promise<WearableDailyBatchResponseDto> {
    const subjectId = req.user.subject_id;
    const rlsContext = { subject_id: subjectId, role: 'user' };

    const stored = await this.wearableService.storeBatch(subjectId, input.days, rlsContext);

    return {
      stored,
      message: `${stored} days received`,
    };
  }

  /**
   * GET /v1/wearable/daily
   * Get wearable metrics for a date range (decrypted)
   */
  @Get('daily')
  @RequiresConsent('wearable')
  @ApiOperation({ summary: 'Get daily wearable metrics', description: 'Retrieve daily wearable metrics for a date range. Returns decrypted data. Requires wearable consent.' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (YYYY-MM-DD)', example: '2026-10-01' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (YYYY-MM-DD)', example: '2026-11-14' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved', type: [WearableDailyDto] })
  @ApiResponse({ status: 400, description: 'Invalid date range or missing consent' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDaily(
    @Req() req: any,
    @Query('from') fromDate: string,
    @Query('to') toDate: string,
  ): Promise<WearableDailyDto[]> {
    const subjectId = req.user.subject_id;
    const rlsContext = { subject_id: subjectId, role: 'user' };

    return await this.wearableService.getDaily(subjectId, fromDate, toDate, rlsContext);
  }

  /**
   * POST /v1/wearable/demo-seed
   * Generate 60 days of synthetic demo data (dev/demo mode only)
   */
  @Post('demo-seed')
  @RequiresConsent('wearable')
  @ApiOperation({
    summary: 'Generate demo wearable data',
    description: 'Generate 60 days of synthetic wearable data for testing. Only enabled in dev/demo mode. Requires wearable consent.',
  })
  @ApiResponse({ status: 201, description: 'Demo data generated', type: DemoSeedResponseDto })
  @ApiResponse({ status: 400, description: 'Demo mode disabled or missing consent' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async demoSeed(@Req() req: any, @Body() input: DemoSeedInputDto): Promise<DemoSeedResponseDto> {
    const subjectId = req.user.subject_id;
    const rlsContext = { subject_id: subjectId, role: 'user' };

    const scenario = input.scenario || 'steady';
    const daysGenerated = await this.wearableService.generateDemoSeed(subjectId, scenario, rlsContext);

    return {
      days_generated: daysGenerated,
      scenario,
      message: `Demo data generated (${daysGenerated} days)`,
    };
  }
}
