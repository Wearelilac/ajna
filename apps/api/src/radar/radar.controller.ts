import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { RadarService } from './radar.service';
import { AuthGuard } from '../auth/auth.guard';
import { RequiresConsent } from '../auth/requires-consent.decorator';
import { RadarSummaryDto, PriPointDto, DeviationFlagDto } from './dto/radar.dto';

@ApiTags('radar')
@Controller('v1/radar')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class RadarController {
  constructor(private readonly radarService: RadarService) {}

  /**
   * GET /v1/radar/summary
   * Get radar summary (latest PRI, trend, active flags)
   */
  @Get('summary')
  @RequiresConsent('wearable')
  @ApiOperation({
    summary: 'Get radar summary',
    description: 'Returns latest PRI, 7-day and 30-day trends, and active deviation flags. Requires wearable consent.',
  })
  @ApiResponse({ status: 200, description: 'Radar summary', type: RadarSummaryDto })
  @ApiResponse({ status: 400, description: 'Missing consent' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSummary(@Req() req: any): Promise<RadarSummaryDto> {
    const subjectId = req.user.subject_id;
    const rlsContext = { subject_id: subjectId, role: 'user' };

    return await this.radarService.getSummary(subjectId, rlsContext);
  }

  /**
   * GET /v1/radar/pri
   * Get PRI history for a date range
   */
  @Get('pri')
  @RequiresConsent('wearable')
  @ApiOperation({
    summary: 'Get PRI history',
    description: 'Returns PRI scores for a date range. Requires wearable consent.',
  })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (YYYY-MM-DD)', example: '2026-10-01' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (YYYY-MM-DD)', example: '2026-11-14' })
  @ApiResponse({ status: 200, description: 'PRI history', type: [PriPointDto] })
  @ApiResponse({ status: 400, description: 'Invalid date range or missing consent' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPriHistory(
    @Req() req: any,
    @Query('from') fromDate: string,
    @Query('to') toDate: string,
  ): Promise<PriPointDto[]> {
    const subjectId = req.user.subject_id;
    const rlsContext = { subject_id: subjectId, role: 'user' };

    return await this.radarService.getPriHistory(subjectId, fromDate, toDate, rlsContext);
  }

  /**
   * GET /v1/radar/deviations
   * Get deviation flags for a date range
   */
  @Get('deviations')
  @RequiresConsent('wearable')
  @ApiOperation({
    summary: 'Get deviation flags',
    description: 'Returns deviation flags (|z| > 3) for a date range. Requires wearable consent.',
  })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (YYYY-MM-DD)', example: '2026-10-01' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (YYYY-MM-DD)', example: '2026-11-14' })
  @ApiResponse({ status: 200, description: 'Deviation flags', type: [DeviationFlagDto] })
  @ApiResponse({ status: 400, description: 'Invalid date range or missing consent' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDeviations(
    @Req() req: any,
    @Query('from') fromDate: string,
    @Query('to') toDate: string,
  ): Promise<DeviationFlagDto[]> {
    const subjectId = req.user.subject_id;
    const rlsContext = { subject_id: subjectId, role: 'user' };

    return await this.radarService.getDeviations(subjectId, fromDate, toDate, rlsContext);
  }
}
