/**
 * Baseline computation processor (B2.2)
 * Consumes ajna.wearable.compute-baseline jobs
 * Computes 30-day rolling baselines, detects deviations, calculates PRI
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { BaselineService } from '../radar/baseline.service';

interface BaselineJobPayload {
  subject_id: string;
  date: string;
}

@Injectable()
@Processor('ajna.wearable.compute-baseline')
export class BaselineProcessor extends WorkerHost {
  private readonly logger = new Logger(BaselineProcessor.name);

  constructor(private readonly baselineService: BaselineService) {
    super();
  }

  async process(job: Job<BaselineJobPayload>): Promise<void> {
    const { subject_id, date } = job.data;

    // No metric values in logs (only IDs)
    this.logger.log(`Processing baseline job ${job.id} for subject ${subject_id.substring(0, 8)}...`);

    try {
      await this.baselineService.computeBaseline(subject_id, date);
      this.logger.log(`Baseline job ${job.id} complete`);
    } catch (error) {
      this.logger.error(`Baseline job ${job.id} failed: ${error.message}`);
      throw error; // Rethrow for BullMQ retry logic
    }
  }
}
