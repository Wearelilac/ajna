/**
 * Community cluster processor (B4.1)
 * Consumes ajna.population.cluster jobs
 * Performs K-means clustering on community vectors
 * to identify underserved community groupings
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';

interface ClusterJobPayload {
  k?: number; // Number of clusters (default: auto-select)
}

interface CommunityVector {
  community_id: string;
  embedding: number[];
  features: {
    flag_rate: number;
    mean_pri: number;
    deviation_share: number;
    deprivation_index: number;
    population_density: number;
  };
}

interface Cluster {
  cluster_id: number;
  centroid: number[];
  members: string[]; // community_ids
}

@Injectable()
@Processor('ajna.population.cluster')
export class CommunityClusterProcessor extends WorkerHost {
  private readonly logger = new Logger(CommunityClusterProcessor.name);

  // K-means parameters (from P0.3 findings)
  private readonly DEFAULT_K = 5; // Default number of clusters
  private readonly MAX_ITERATIONS = 100;
  private readonly CONVERGENCE_THRESHOLD = 0.001;

  constructor(private readonly pool: Pool) {
    super();
  }

  async process(job: Job<ClusterJobPayload>): Promise<void> {
    const { k } = job.data;

    this.logger.log(
      `Processing community cluster job ${job.id} ` +
        `(k=${k || this.DEFAULT_K})`,
    );

    try {
      // Load community vectors
      const vectors = await this.loadVectors();

      if (vectors.length < (k || this.DEFAULT_K)) {
        this.logger.warn(
          `Not enough communities (${vectors.length}) for clustering with k=${k || this.DEFAULT_K}, skipping`,
        );
        return;
      }

      // Run K-means
      const clusters = await this.kMeansClustering(vectors, k || this.DEFAULT_K);

      // Compute cluster labels and scores
      const labeledClusters = this.labelClusters(clusters, vectors);

      // Store results
      await this.storeClusters(labeledClusters);

      this.logger.log(
        `Clustering complete: ${clusters.length} clusters, ` +
          `${vectors.length} communities`,
      );
    } catch (error) {
      this.logger.error(`Community cluster job ${job.id} failed: ${error.message}`);
      throw error; // Rethrow for BullMQ retry logic
    }
  }

  /**
   * Load community vectors from database
   */
  private async loadVectors(): Promise<CommunityVector[]> {
    const client = await this.pool.connect();
    try {
      // Set RLS context (app_worker role for read access)
      await client.query(`SET LOCAL app.role = 'worker'`);

      const result = await client.query(`
        SELECT community_id, embedding, features
        FROM community_vectors
        ORDER BY community_id
      `);

      return result.rows.map((row) => ({
        community_id: row.community_id,
        embedding: this.parseVector(row.embedding),
        features: row.features,
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Parse pgvector format '[0.1, 0.2, ...]' to number[]
   */
  private parseVector(vectorStr: string): number[] {
    // Remove brackets and parse
    const cleaned = vectorStr.replace(/[\[\]]/g, '');
    return cleaned.split(',').map((v) => parseFloat(v.trim()));
  }

  /**
   * K-means clustering
   * Returns cluster assignments and centroids
   */
  private async kMeansClustering(
    vectors: CommunityVector[],
    k: number,
  ): Promise<Cluster[]> {
    // Initialize centroids (random selection)
    const initialCentroids = this.selectInitialCentroids(vectors, k);
    let centroids = initialCentroids;

    let iteration = 0;
    let converged = false;

    while (iteration < this.MAX_ITERATIONS && !converged) {
      // Assign vectors to nearest centroid
      const assignments = vectors.map((v) => this.nearestCentroid(v.embedding, centroids));

      // Compute new centroids
      const newCentroids: number[][] = [];
      for (let clusterId = 0; clusterId < k; clusterId++) {
        const clusterMembers = vectors.filter((_, idx) => assignments[idx] === clusterId);

        if (clusterMembers.length === 0) {
          // Empty cluster: reinitialize to random point
          newCentroids.push(vectors[Math.floor(Math.random() * vectors.length)].embedding);
        } else {
          // Compute mean of cluster members
          const dim = clusterMembers[0].embedding.length;
          const sum = new Array(dim).fill(0);

          for (const member of clusterMembers) {
            for (let i = 0; i < dim; i++) {
              sum[i] += member.embedding[i];
            }
          }

          newCentroids.push(sum.map((v) => v / clusterMembers.length));
        }
      }

      // Check convergence (centroid movement)
      const maxMovement = Math.max(
        ...centroids.map((c, idx) => this.euclideanDistance(c, newCentroids[idx])),
      );

      converged = maxMovement < this.CONVERGENCE_THRESHOLD;
      centroids = newCentroids;
      iteration++;
    }

    // Build final clusters
    const assignments = vectors.map((v) => this.nearestCentroid(v.embedding, centroids));
    const clusters: Cluster[] = [];

    for (let clusterId = 0; clusterId < k; clusterId++) {
      const members = vectors
        .filter((_, idx) => assignments[idx] === clusterId)
        .map((v) => v.community_id);

      clusters.push({
        cluster_id: clusterId,
        centroid: centroids[clusterId],
        members,
      });
    }

    this.logger.log(
      `K-means converged in ${iteration} iterations (max movement: ${maxMovement < this.CONVERGENCE_THRESHOLD ? '<' : '>'}${this.CONVERGENCE_THRESHOLD})`,
    );

    return clusters;
  }

  /**
   * Select initial centroids (K-means++ algorithm)
   */
  private selectInitialCentroids(vectors: CommunityVector[], k: number): number[][] {
    const centroids: number[][] = [];

    // First centroid: random
    centroids.push(vectors[Math.floor(Math.random() * vectors.length)].embedding);

    // Subsequent centroids: proportional to distance from nearest existing centroid
    for (let i = 1; i < k; i++) {
      const distances = vectors.map((v) => {
        const nearestDist = Math.min(
          ...centroids.map((c) => this.euclideanDistance(v.embedding, c)),
        );
        return nearestDist * nearestDist; // Square for probability weighting
      });

      const totalDist = distances.reduce((sum, d) => sum + d, 0);
      const rand = Math.random() * totalDist;

      let cumulative = 0;
      for (let j = 0; j < vectors.length; j++) {
        cumulative += distances[j];
        if (cumulative >= rand) {
          centroids.push(vectors[j].embedding);
          break;
        }
      }
    }

    return centroids;
  }

  /**
   * Find nearest centroid (returns cluster ID)
   */
  private nearestCentroid(embedding: number[], centroids: number[][]): number {
    let minDist = Infinity;
    let nearest = 0;

    for (let i = 0; i < centroids.length; i++) {
      const dist = this.euclideanDistance(embedding, centroids[i]);
      if (dist < minDist) {
        minDist = dist;
        nearest = i;
      }
    }

    return nearest;
  }

  /**
   * Euclidean distance between two vectors
   */
  private euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, v, i) => sum + Math.pow(v - (b[i] || 0), 2), 0));
  }

  /**
   * Label clusters based on feature patterns
   * Returns descriptive labels (NOT diagnostic)
   */
  private labelClusters(
    clusters: Cluster[],
    allVectors: CommunityVector[],
  ): Array<{
    cluster_id: number;
    label: string;
    score: number;
    score_breakdown: Record<string, number>;
    members: string[];
  }> {
    return clusters.map((cluster) => {
      const members = allVectors.filter((v) => cluster.members.includes(v.community_id));

      if (members.length === 0) {
        return {
          cluster_id: cluster.cluster_id,
          label: 'Empty cluster',
          score: 0,
          score_breakdown: {},
          members: [],
        };
      }

      // Compute average features for cluster
      const avgFeatures = {
        flag_rate:
          members.reduce((sum, m) => sum + m.features.flag_rate, 0) / members.length,
        mean_pri: members.reduce((sum, m) => sum + m.features.mean_pri, 0) / members.length,
        deviation_share:
          members.reduce((sum, m) => sum + m.features.deviation_share, 0) / members.length,
        deprivation_index:
          members.reduce((sum, m) => sum + m.features.deprivation_index, 0) / members.length,
        population_density:
          members.reduce((sum, m) => sum + m.features.population_density, 0) / members.length,
      };

      // Compute composite score (0-100)
      // Higher score = more underserved (high deprivation, low PRI, high deviation)
      const score =
        avgFeatures.deprivation_index * 40 + // 40% weight on deprivation
        (1 - avgFeatures.mean_pri / 100) * 30 + // 30% weight on low PRI
        avgFeatures.deviation_share * 20 + // 20% weight on deviations
        avgFeatures.flag_rate * 10; // 10% weight on flags

      const scoreNormalized = Math.round(Math.min(100, Math.max(0, score * 100)) * 100) / 100;

      // Generate descriptive label (NOT diagnostic)
      const label = this.generateLabel(avgFeatures);

      return {
        cluster_id: cluster.cluster_id,
        label,
        score: scoreNormalized,
        score_breakdown: {
          deprivation: Math.round(avgFeatures.deprivation_index * 100),
          pri: Math.round(avgFeatures.mean_pri),
          deviation_share: Math.round(avgFeatures.deviation_share * 100),
          flag_rate: Math.round(avgFeatures.flag_rate * 100) / 100,
        },
        members: cluster.members,
      };
    });
  }

  /**
   * Generate descriptive cluster label
   * Avoids diagnostic language (no "diagnos*", "disease", "disorder")
   */
  private generateLabel(features: {
    flag_rate: number;
    mean_pri: number;
    deviation_share: number;
    deprivation_index: number;
  }): string {
    const parts: string[] = [];

    // Deprivation
    if (features.deprivation_index > 0.7) {
      parts.push('High deprivation');
    } else if (features.deprivation_index < 0.3) {
      parts.push('Low deprivation');
    }

    // PRI
    if (features.mean_pri < 40) {
      parts.push('lower resilience scores');
    } else if (features.mean_pri > 60) {
      parts.push('higher resilience scores');
    }

    // Deviation
    if (features.deviation_share > 0.3) {
      parts.push('frequent deviations');
    }

    // Flag rate
    if (features.flag_rate > 0.5) {
      parts.push('elevated flag rate');
    }

    if (parts.length === 0) {
      return 'Typical community pattern';
    }

    return parts.join(', ');
  }

  /**
   * Store clusters in database
   */
  private async storeClusters(
    clusters: Array<{
      cluster_id: number;
      label: string;
      score: number;
      score_breakdown: Record<string, number>;
      members: string[];
    }>,
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Set RLS context (app_worker role for write access)
      await client.query(`SET LOCAL app.role = 'worker'`);

      // Clear old clusters
      await client.query(`DELETE FROM community_clusters`);

      // Insert new clusters
      for (const cluster of clusters) {
        for (const communityId of cluster.members) {
          await client.query(
            `
            INSERT INTO community_clusters (community_id, cluster_id, label, score, score_breakdown, computed_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            `,
            [
              communityId,
              cluster.cluster_id,
              cluster.label,
              cluster.score,
              JSON.stringify(cluster.score_breakdown),
            ],
          );
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
