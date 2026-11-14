import { Module } from '@nestjs/common';
import { WearableController } from './wearable.controller';
import { WearableService } from './wearable.service';
import { VaultService } from '../common/vault.service';
import { AuthService } from '../auth/auth.service';
import { ConsentService } from '../auth/consent.service';

@Module({
  controllers: [WearableController],
  providers: [WearableService, VaultService, AuthService, ConsentService],
  exports: [WearableService],
})
export class WearableModule {}
