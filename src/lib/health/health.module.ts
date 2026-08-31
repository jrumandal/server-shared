import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { PrismaModule } from '../prisma/prisma.module';
import { HealthController } from './health.controller';

/**
 * Health module for all micro-services.
 *
 * Provides the `/health` endpoint (see `health.controller.ts`) backed by
 * `@nestjs/terminus` and a Prisma database ping.
 */
@Module({
  imports: [TerminusModule, PrismaModule],
  controllers: [HealthController],
})
export class HealthModule {}
