import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './configuration';

/**
 * Global configuration module for all micro-services.
 *
 * Registers a typed `configuration` factory (see `configuration.ts`) so
 * services can read env-driven settings via `ConfigService` instead of
 * touching `process.env` directly.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
  ],
})
export class AppConfigModule {}
