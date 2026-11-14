import { Module } from '@nestjs/common';
import { RadarController } from './radar.controller';
import { RadarService } from './radar.service';
import { BaselineService } from './baseline.service';
import { BaselineProcessor } from '../workers/baseline.processor';
import { VaultService } from '../common/vault.service';
import { AuthService } from '../auth/auth.service';
import { ConsentService } from '../auth/consent.service';

@Module({
  controllers: [RadarController],
  providers: [
    RadarService,
    BaselineService,
    BaselineProcessor,
    VaultService,
    AuthService,
    ConsentService,
  ],
  exports: [RadarService, BaselineService],
})
export class RadarModule {}
