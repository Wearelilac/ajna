/**
 * B4.1: Population Controller
 * Public health official endpoints (app_official role)
 * K-anonymity enforced, NO row-level data access
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PopulationService } from './population.service';
import {
  PopulationOverviewDto,
  CommunitySummaryDto,
  CommunityTrendDto,
  SimilarCommunityDto,
  ClusterSummaryDto,
} from './dto/population.dto';

@Controller('v1/population')
export class PopulationController {
  constructor(private readonly populationService: PopulationService) {}

  /**
   * GET /v1/population/overview
   * Returns: total communities, subjects, flags, avg PRI (last 30 days)
   * Role: app_official, app_admin
   */
  @Get('overview')
  async getOverview(): Promise<PopulationOverviewDto> {
    // TODO: Check app_official role (from RoleGuard)
    return await this.populationService.getOverview();
  }

  /**
   * GET /v1/population/communities
   * List communities with filters
   * Query params: regionCode, minDeprivationIndex, sort, limit, offset
   */
  @Get('communities')
  async listCommunities(
    @Query('regionCode') regionCode?: string,
    @Query('minDeprivationIndex') minDeprivationIndex?: string,
    @Query('sort') sort?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<CommunitySummaryDto[]> {
    return await this.populationService.listCommunities({
      regionCode,
      minDeprivationIndex: minDeprivationIndex
        ? parseFloat(minDeprivationIndex)
        : undefined,
      sort,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  /**
   * GET /v1/population/communities/:id
   * Get community detail with 12-month trend
   */
  @Get('communities/:id')
  async getCommunity(@Param('id') communityId: string): Promise<CommunityTrendDto> {
    return await this.populationService.getCommunity(communityId);
  }

  /**
   * GET /v1/population/communities/:id/similar
   * Find similar communities (pgvector cosine similarity)
   * Query params: limit (default: 10)
   */
  @Get('communities/:id/similar')
  async getSimilarCommunities(
    @Param('id') communityId: string,
    @Query('limit') limit?: string,
  ): Promise<SimilarCommunityDto[]> {
    return await this.populationService.getSimilarCommunities(
      communityId,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  /**
   * GET /v1/population/clusters
   * List clusters with member counts
   */
  @Get('clusters')
  async getClusters(): Promise<ClusterSummaryDto[]> {
    return await this.populationService.getClusters();
  }
}

@Controller('v1/admin/demo')
export class DemoController {
  constructor(private readonly populationService: PopulationService) {}

  /**
   * POST /v1/admin/demo/population-seed
   * Generate demo population data (demo mode only)
   */
  @Post('population-seed')
  @HttpCode(HttpStatus.OK)
  async generatePopulationSeed(): Promise<{ message: string; counts: any }> {
    // TODO: Check admin role
    return await this.populationService.generateDemoData();
  }
}
