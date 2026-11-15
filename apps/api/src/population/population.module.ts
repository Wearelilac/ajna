/**
 * B4.1: Population Module
 * K-anonymity enforced aggregation for public health officials
 */

import { Module } from '@nestjs/common';
import { PopulationService } from './population.service';
import { PopulationController, DemoController } from './population.controller';

@Module({
  imports: [],
  controllers: [PopulationController, DemoController],
  providers: [PopulationService],
  exports: [PopulationService],
})
export class PopulationModule {}
