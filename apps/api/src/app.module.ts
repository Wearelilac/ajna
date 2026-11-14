import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { HealthModule } from './modules/health/health.module';
import { WearableModule } from './wearable/wearable.module';
import { RadarModule } from './radar/radar.module';
import { MonitorModule } from './monitor/monitor.module';
import { RequestIdMiddleware } from './common/request-id.middleware';

@Module({
  imports: [HealthModule, WearableModule, RadarModule, MonitorModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
