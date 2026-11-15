/**
 * Community vector processor (B4.1)
 * Consumes ajna.population.compute-vectors jobs
 * Computes normalized feature vectors from community aggregates
 * for pgvector similarity search (HNSW index)
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { LIMITS } from '../common/limits';

interface VectorJobPayload {
  community_id?: string; // If omitted, compute all communities
}

interface CommunityFeatures {
  community_id: string;
  flag_rate: number; // flags per subject per month
  mean_pri: number; // 0-100
  deviation_share: number; // 0-1
  deprivation_index: number; // 0-1
  population_density: number; // subjects per sq km (if available)
}

@Injectable()
@Processor('ajna.population.compute-vectors')
export class CommunityVectorProcessor extends WorkerHost {
  private readonly logger = new Logger(CommunityVectorProcessor.name);

  // Embedding dimensions (from P0.3 findings: 128-dim for balance of recall/memory)
  private readonly EMBEDDING_DIM = LIMITS.POPULATION.EMBEDDING_DIM;

  constructor(private readonly pool: Pool) {
    super();
  }

  async process(job: Job<VectorJobPayload>): Promise<void> {
    const { community_id } = job.data;

    this.logger.log(
      `Processing community vector job ${job.id} ` +
        `(community: ${community_id || 'all'})`,
    );

    try {
      if (community_id) {
        await this.computeVectorForCommunity(community_id);
      } else {
        await this.computeVectorsForAllCommunities();
      }

      this.logger.log(`Community vector job ${job.id} complete`);
    } catch (error) {
      this.logger.error(`Community vector job ${job.id} failed: ${error.message}`);
      throw error; // Rethrow for BullMQ retry logic
    }
  }

  /**
   * Compute vector for a single community
   */
  private async computeVectorForCommunity(communityId: string): Promise<void> {
    const features = await this.extractFeatures([communityId]);
    if (features.length === 0) {
      this.logger.warn(`No features found for community ${communityId}, skipping`);
      return;
    }

    const embedding = this.computeEmbedding(features[0]);
    await this.storeVector(communityId, embedding, features[0]);

    this.logger.log(`Vector computed for community ${communityId}`);
  }

  /**
   * Compute vectors for all communities
   */
  private async computeVectorsForAllCommunities(): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Get all community IDs
      const result = await client.query(`SELECT community_id FROM communities`);
      const communityIds = result.rows.map((r) => r.community_id);

      if (communityIds.length === 0) {
        this.logger.warn('No communities found, skipping vector computation');
        return;
      }

      // Extract features for all communities
      const features = await this.extractFeatures(communityIds);

      if (features.length === 0) {
        this.logger.warn('No features extracted, skipping vector computation');
        return;
      }

      // Normalize features across all communities (z-score normalization)
      const normalized = this.normalizeFeatures(features);

      // Compute and store embeddings
      for (const feature of normalized) {
        const embedding = this.computeEmbedding(feature);
        await this.storeVector(feature.community_id, embedding, feature);
      }

      this.logger.log(
        `Vectors computed for ${normalized.length} communities ` +
          `(${this.EMBEDDING_DIM}-dim embeddings)`,
      );
    } finally {
      client.release();
    }
  }

  /**
   * Extract features from community aggregates
   * Returns raw (unnormalized) features
   */
  private async extractFeatures(communityIds: string[]): Promise<CommunityFeatures[]> {
    const client = await this.pool.connect();
    try {
      // Set RLS context (app_worker role for read access)
      await client.query(`SET LOCAL app.role = 'worker'`);

      // Query: latest month aggregate + community metadata
      const result = await client.query(
        `
        WITH latest_month AS (
          SELECT
            community_id,
            AVG(CASE WHEN NOT suppressed THEN mean_pri ELSE NULL END) AS mean_pri,
            AVG(CASE WHEN NOT suppressed THEN deviation_share ELSE NULL END) AS deviation_share,
            AVG(CASE WHEN NOT suppressed THEN flag_count::numeric / NULLIF(subjects_n, 0) ELSE NULL END) AS flag_rate
          FROM community_month_agg
          WHERE month_start >= CURRENT_DATE - INTERVAL '3 months'
            AND community_id = ANY($1)
          GROUP BY community_id
        )
        SELECT
          c.community_id,
          COALESCE(lm.flag_rate, 0) AS flag_rate,
          COALESCE(lm.mean_pri, 50) AS mean_pri,
          COALESCE(lm.deviation_share, 0) AS deviation_share,
          COALESCE(c.deprivation_index, 0.5) AS deprivation_index,
          COALESCE(c.population_estimate, 1000) AS population_estimate
        FROM communities c
        LEFT JOIN latest_month lm ON c.community_id = lm.community_id
        WHERE c.community_id = ANY($1)
        `,
        [communityIds],
      );

      return result.rows.map((row) => ({
        community_id: row.community_id,
        flag_rate: parseFloat(row.flag_rate),
        mean_pri: parseFloat(row.mean_pri),
        deviation_share: parseFloat(row.deviation_share),
        deprivation_index: parseFloat(row.deprivation_index),
        population_density: parseFloat(row.population_estimate) / 1000, // Normalize by 1k
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Normalize features (z-score normalization)
   * Ensures features are on same scale before embedding
   */
  private normalizeFeatures(features: CommunityFeatures[]): CommunityFeatures[] {
    const keys: (keyof Omit<CommunityFeatures, 'community_id'>)[] = [
      'flag_rate',
      'mean_pri',
      'deviation_share',
      'deprivation_index',
      'population_density',
    ];

    // Compute mean and SD for each feature
    const stats: Record<string, { mean: number; sd: number }> = {};
    for (const key of keys) {
      const values = features.map((f) => f[key] as number);
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const sd = Math.sqrt(variance);

      stats[key] = { mean, sd: sd || 1.0 }; // Prevent division by zero
    }

    // Normalize each feature
    return features.map((f) => {
      const normalized: CommunityFeatures = { ...f };
      for (const key of keys) {
        const value = f[key] as number;
        normalized[key] = (value - stats[key].mean) / stats[key].sd;
      }
      return normalized;
    });
  }

  /**
   * Compute embedding from normalized features
   * Uses simple linear projection (5 features → 128-dim)
   * In production, this could be replaced with a trained model
   */
  private computeEmbedding(features: CommunityFeatures): number[] {
    // Base features (5-dim)
    const base = [
      features.flag_rate,
      features.mean_pri,
      features.deviation_share,
      features.deprivation_index,
      features.population_density,
    ];

    // Simple expansion: repeat + add noise for dimensionality
    // This is a placeholder; real implementation would use trained weights
    const embedding: number[] = [];
    for (let i = 0; i < this.EMBEDDING_DIM; i++) {
      const baseIdx = i % base.length;
      const value = base[baseIdx];

      // Add small rotation (sine/cosine pattern)
      const phase = (i / this.EMBEDDING_DIM) * 2 * Math.PI;
      const rotated = value * Math.cos(phase + baseIdx);

      embedding.push(rotated);
    }

    // Normalize to unit length (for cosine similarity)
    const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    return embedding.map((v) => v / (magnitude || 1.0));
  }

  /**
   * Store vector in database (upsert for idempotency)
   */
  private async storeVector(
    communityId: string,
    embedding: number[],
    features: CommunityFeatures,
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Set RLS context (app_worker role for write access)
      await client.query(`SET LOCAL app.role = 'worker'`);

      // Convert embedding to pgvector format: '[0.1, 0.2, ...]'
      const vectorStr = `[${embedding.join(',')}]`;

      // Store features as JSONB for transparency
      const featuresJson = {
        flag_rate: features.flag_rate,
        mean_pri: features.mean_pri,
        deviation_share: features.deviation_share,
        deprivation_index: features.deprivation_index,
        population_density: features.population_density,
      };

      await client.query(
        `
        INSERT INTO community_vectors (community_id, embedding, features, computed_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (community_id)
        DO UPDATE SET
          embedding = EXCLUDED.embedding,
          features = EXCLUDED.features,
          computed_at = NOW()
        `,
        [communityId, vectorStr, JSON.stringify(featuresJson)],
      );
    } finally {
      client.release();
    }
  }
}
