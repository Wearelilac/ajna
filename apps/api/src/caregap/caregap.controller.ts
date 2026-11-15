/**
 * B4.2: Care-Gap Controller
 * Endpoints for care-gap detection, pathway matching, and outreach draft review
 * NO automatic sending - human review required
 */

import { Controller, Get, Post, Put, Param, Query, Body, UseGuards } from '@nestjs/common';
import { CareGapService } from './caregap.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  CareGapDto,
  PathwayMatchDto,
  OutreachDraftDto,
  CarePathwayDto,
  DraftTransitionDto,
  UpdateDraftBodyDto,
} from './dto/caregap.dto';

@Controller('v1')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CareGapController {
  constructor(private readonly careGapService: CareGapService) {}

  // ============================================================================
  // Care Pathways
  // ============================================================================

  @Get('care-pathways')
  @Roles('reviewer', 'clinical_supervisor', 'admin')
  async listPathways(): Promise<CarePathwayDto[]> {
    return this.careGapService.listPathways();
  }

  // ============================================================================
  // Care Gaps
  // ============================================================================

  @Get('care-gaps')
  @Roles('reviewer', 'clinical_supervisor', 'admin')
  async listGaps(
    @Query('gapType') gapType?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<CareGapDto[]> {
    return this.careGapService.listGaps({
      gapType,
      status,
      limit,
      offset,
    });
  }

  @Get('care-gaps/:id')
  @Roles('reviewer', 'clinical_supervisor', 'admin')
  async getGap(@Param('id') id: string): Promise<CareGapDto> {
    return this.careGapService.getGapById(id);
  }

  @Get('care-gaps/:id/matches')
  @Roles('reviewer', 'clinical_supervisor', 'admin')
  async getMatches(@Param('id') id: string): Promise<PathwayMatchDto[]> {
    return this.careGapService.getMatches(id);
  }

  // ============================================================================
  // Outreach Drafts
  // ============================================================================

  @Get('outreach-drafts')
  @Roles('reviewer', 'clinical_supervisor', 'admin')
  async listDrafts(
    @Query('status') status?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<OutreachDraftDto[]> {
    return this.careGapService.listDrafts({
      status,
      limit,
      offset,
    });
  }

  @Get('outreach-drafts/:id')
  @Roles('reviewer', 'clinical_supervisor', 'admin')
  async getDraft(@Param('id') id: string): Promise<OutreachDraftDto> {
    return this.careGapService.getDraftById(id);
  }

  @Put('outreach-drafts/:id/body')
  @Roles('reviewer', 'clinical_supervisor', 'admin')
  async updateDraftBody(
    @Param('id') id: string,
    @Body() body: UpdateDraftBodyDto,
    @CurrentUser() user: { id: string },
  ): Promise<{ success: boolean }> {
    await this.careGapService.updateDraftBody(id, body.body, user.id);
    return { success: true };
  }

  @Post('outreach-drafts/:id/transition')
  @Roles('reviewer', 'clinical_supervisor', 'admin')
  async transitionDraft(
    @Param('id') id: string,
    @Body() transition: DraftTransitionDto,
    @CurrentUser() user: { id: string; role: string },
  ): Promise<{ success: boolean }> {
    await this.careGapService.transitionDraft(
      id,
      transition.toStatus,
      user.id,
      user.role,
      transition.reason,
      transition.editedBody,
    );
    return { success: true };
  }
}
