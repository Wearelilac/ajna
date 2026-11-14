/**
 * B3.1: Monitor module
 * Monitor sessions, de-identified flags, and crisis review queue
 */

import { Module } from '@nestjs/common';
import { MonitorService } from './monitor.service';
import { CrisisService } from './crisis.service';
import { MonitorController } from './monitor.controller';
import { CrisisController } from './crisis.controller';

@Module({
  imports: [],
  controllers: [MonitorController, CrisisController],
  providers: [MonitorService, CrisisService],
  exports: [MonitorService, CrisisService],
})
export class MonitorModule {}
