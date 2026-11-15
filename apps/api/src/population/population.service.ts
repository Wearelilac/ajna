/**
 * B4.1: Population Service
 * K-anonymity enforced aggregation for public health officials
 * Officials see ONLY aggregates, NEVER row-level data
 */

import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { AppError, ERROR_CODES } from '../common/errors';
import {
  PopulationOverviewDto,
  CommunitySummaryDto,
  CommunityTrendDto,
  SimilarCommunityDto,
  ClusterSummaryDto,
} from './dto/population.dto';

const K_ANONYMITY_THRESHOLD = 10; // Minimum group size

@Injectable()
export class PopulationService {
  private readonly logger = new Logger(PopulationService.name);

  constructor(private readonly pool: Pool) {}

  /**
   * Get population overview (last 30 days)
   * Returns: total communities, subjects, flags, avg PRI
   */
  async getOverview(): Promise<PopulationOverviewDto> {
    const result = await this.pool.query<{
      total_communities: string;
      total_subjects: string;
      total_flags: string;
      avg_pri: string;
      latest_week: Date;
    }>(`
      SELECT * FROM v_population_overview
    `);

    if (result.rows.length === 0) {
      throw new AppError(
        404,
        ERROR_CODES.POPULATION_DATA_NOT_READY,
        'Population data not yet available',
      );
    }

    const row = result.rows[0];
    return {
      totalCommunities: parseInt(row.total_communities, 10),
      totalSubjects: parseInt(row.total_subjects, 10),
      totalFlags: parseInt(row.total_flags, 10),
      avgPri: parseFloat(row.avg_pri),
      latestWeek: row.latest_week.toISOString(),
    };
  }

  /**
   * List communities with latest month summary
   * Filters: regionCode, minDeprivationIndex
   */
  async listCommunities(params: {
    regionCode?: string;
    minDeprivationIndex?: number;
    sort?: string;
    limit?: number;
    offset?: number;
  }): Promise<CommunitySummaryDto[]> {
    const conditions: string[] = ['1=1'];
    const queryParams: any[] = [];

    if (params.regionCode) {
      queryParams.push(params.regionCode);
      conditions.push(`region_code = $${queryParams.length}`);
    }

    if (params.minDeprivationIndex !== undefined) {
      queryParams.push(params.minDeprivationIndex);
      conditions.push(`deprivation_index >= $${queryParams.length}`);
    }

    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;
    queryParams.push(limit, offset);

    const sortBy = params.sort === 'deprivation' ? 'deprivation_index DESC' : 'name';

    const result = await this.pool.query<{
      community_id: string;
      name: string;
      region_code: string;
      deprivation_index: number;
      population_estimate: number;
      latest_month: Date;
      subjects_n: number;
      flag_count: number;
      mean_pri: number;
      deviation_share: number;
      suppressed: boolean;
    }>(
      `
      SELECT * FROM v_community_summary
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${sortBy}
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
      `,
      queryParams,
    );

    return result.rows.map((row) => ({
      communityId: row.community_id,
      name: row.name,
      regionCode: row.region_code,
      deprivationIndex: row.deprivation_index,
      populationEstimate: row.population_estimate,
      latestMonth: row.latest_month?.toISOString(),
      subjectsN: row.suppressed ? null : row.subjects_n,
      flagCount: row.suppressed ? null : row.flag_count,
      meanPri: row.suppressed ? null : row.mean_pri,
      deviationShare: row.suppressed ? null : row.deviation_share,
      suppressed: row.suppressed,
    }));
  }

  /**
   * Get community detail with 12-month trend
   */
  async getCommunity(communityId: string): Promise<CommunityTrendDto> {
    // Get community info
    const commResult = await this.pool.query<{
      community_id: string;
      name: string;
      region_code: string;
      deprivation_index: number;
      population_estimate: number;
    }>(
      `SELECT * FROM communities WHERE community_id = $1`,
      [communityId],
    );

    if (commResult.rows.length === 0) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, 'Community not found');
    }

    const community = commResult.rows[0];

    // Get 12-month trend (aggregated across age bands)
    const trendResult = await this.pool.query<{
      month_start: Date;
      subjects_n: number;
      flag_count: number;
      mean_pri: number;
      deviation_share: number;
      suppressed: boolean;
    }>(
      `
      SELECT 
        month_start,
        SUM(CASE WHEN NOT suppressed THEN subjects_n ELSE 0 END) AS subjects_n,
        SUM(CASE WHEN NOT suppressed THEN flag_count ELSE 0 END) AS flag_count,
        AVG(CASE WHEN NOT suppressed THEN mean_pri ELSE NULL END) AS mean_pri,
        AVG(CASE WHEN NOT suppressed THEN deviation_share ELSE NULL END) AS deviation_share,
        BOOL_OR(suppressed) AS suppressed
      FROM community_month_agg
      WHERE community_id = $1
        AND month_start > NOW() - INTERVAL '12 months'
      GROUP BY month_start
      ORDER BY month_start DESC
      `,
      [communityId],
    );

    return {
      communityId: community.community_id,
      name: community.name,
      regionCode: community.region_code,
      deprivationIndex: community.deprivation_index,
      populationEstimate: community.population_estimate,
      monthlyTrend: trendResult.rows.map((row) => ({
        month: row.month_start.toISOString(),
        subjectsN: row.suppressed ? null : row.subjects_n,
        flagCount: row.suppressed ? null : row.flag_count,
        meanPri: row.suppressed ? null : row.mean_pri,
        deviationShare: row.suppressed ? null : row.deviation_share,
        suppressed: row.suppressed,
      })),
    };
  }

  /**
   * Find similar communities (pgvector cosine similarity)
   */
  async getSimilarCommunities(
    communityId: string,
    limit: number = 10,
  ): Promise<SimilarCommunityDto[]> {
    // Get target community embedding
    const targetResult = await this.pool.query<{
      embedding: string;
    }>(
      `SELECT embedding FROM community_vectors WHERE community_id = $1`,
      [communityId],
    );

    if (targetResult.rows.length === 0) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, 'Community vector not found');
    }

    const targetEmbedding = targetResult.rows[0].embedding;

    // Find similar communities (pgvector cosine distance)
    const result = await this.pool.query<{
      community_id: string;
      name: string;
      region_code: string;
      deprivation_index: number;
      distance: number;
      features: any;
    }>(
      `
      SELECT 
        c.community_id,
        c.name,
        c.region_code,
        c.deprivation_index,
        v.embedding <=> $1::vector AS distance,
        v.features
      FROM community_vectors v
      JOIN communities c ON v.community_id = c.community_id
      WHERE v.community_id != $2
      ORDER BY distance
      LIMIT $3
      `,
      [targetEmbedding, communityId, limit],
    );

    return result.rows.map((row) => ({
      communityId: row.community_id,
      name: row.name,
      regionCode: row.region_code,
      deprivationIndex: row.deprivation_index,
      similarity: 1 - row.distance / 2, // Convert distance to similarity (0-1)
      features: row.features,
    }));
  }

  /**
   * List clusters with member communities
   */
  async getClusters(): Promise<ClusterSummaryDto[]> {
    const result = await this.pool.query<{
      cluster_id: number;
      label: string;
      avg_score: string;
      member_count: string;
    }>(
      `
      SELECT 
        cluster_id,
        MAX(label) AS label,
        AVG(score) AS avg_score,
        COUNT(*) AS member_count
      FROM community_clusters
      GROUP BY cluster_id
      ORDER BY cluster_id
      `,
    );

    return result.rows.map((row) => ({
      clusterId: row.cluster_id,
      label: row.label,
      avgScore: parseFloat(row.avg_score),
      memberCount: parseInt(row.member_count, 10),
    }));
  }

  /**
   * Generate demo population data (demo mode only)
   */
  async generateDemoData(): Promise<{ message: string; counts: any }> {
    // TODO: Check if demo mode enabled
    const DEMO_MODE = process.env.AJNA_DEMO_MODE === 'true';
    if (!DEMO_MODE) {
      throw new AppError(
        403,
        ERROR_CODES.DEMO_MODE_DISABLED,
        'Demo mode is not enabled',
      );
    }

    this.logger.log('Generating demo population data...');

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Generate 10 synthetic communities
      const communities = [];
      for (let i = 0; i < 10; i++) {
        const communityId = `DEMO_COMM_${i.toString().padStart(3, '0')}`;
        const regionCodes = ['US-CA', 'US-TX', 'US-NY', 'US-FL', 'US-IL'];
        const regionCode = regionCodes[i % regionCodes.length];
        const deprivationIndex = Math.random() * 0.8 + 0.1; // 0.1-0.9

        await client.query(
          `
          INSERT INTO communities (community_id, name, region_code, deprivation_index, population_estimate)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (community_id) DO NOTHING
          `,
          [
            communityId,
            `Demo Community ${i}`,
            regionCode,
            deprivationIndex,
            Math.floor(Math.random() * 5000) + 1000,
          ],
        );

        communities.push(communityId);
      }

      // Generate aggregates for last 3 months
      const ageBands = ['0-18', '19-50', '51+'];
      let aggCount = 0;

      for (const communityId of communities) {
        for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
          const monthStart = new Date();
          monthStart.setMonth(monthStart.getMonth() - monthOffset);
          monthStart.setDate(1);

          for (const ageBand of ageBands) {
            const subjectsN = Math.floor(Math.random() * 50) + 15; // 15-65
            const flagCount = Math.floor(Math.random() * subjectsN * 0.3);
            const meanPri = Math.random() * 60 + 20; // 20-80
            const deviationShare = Math.random() * 0.3;

            await client.query(
              `
              INSERT INTO community_month_agg (
                community_id, month_start, age_band, subjects_n, flag_count,
                mean_pri, median_pri, p10_pri, p90_pri, deviation_share, suppressed
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false)
              ON CONFLICT (community_id, month_start, age_band) DO NOTHING
              `,
              [
                communityId,
                monthStart,
                ageBand,
                subjectsN,
                flagCount,
                meanPri,
                Math.floor(meanPri),
                Math.floor(meanPri * 0.6),
                Math.floor(meanPri * 1.4),
                deviationShare,
              ],
            );
            aggCount++;
          }
        }
      }

      await client.query('COMMIT');
      this.logger.log(`Generated ${communities.length} communities, ${aggCount} aggregates`);

      return {
        message: 'Demo population data generated',
        counts: {
          communities: communities.length,
          aggregates: aggCount,
        },
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
