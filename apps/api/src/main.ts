import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppExceptionFilter } from './common/exception-filter';
import { getConfig } from './common/config';
import { logger } from './common/logger';

async function bootstrap() {
  const config = getConfig();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // Global exception filter
  app.useGlobalFilters(new AppExceptionFilter());

  // Swagger / OpenAPI
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Ajna API')
    .setDescription('Privacy-first population health platform')
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer' },
      'bearerAuth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(config.AJNA_PORT, '0.0.0.0');

  logger.info(
    {
      event: 'application_started',
      port: config.AJNA_PORT,
      environment: config.AJNA_ENV,
    },
    'Application started successfully',
  );
}

bootstrap().catch((err) => {
  logger.error(err, 'Fatal error during bootstrap');
  process.exit(1);
});
