import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';

/**
 * Shared NestJS module for all micro-services.
 *
 * Re-exports the global `PrismaModule` so that importing `SharedModule`
 * makes `PrismaService` available app-wide.
 */
@Module({
  imports: [PrismaModule],
  controllers: [],
  providers: [],
  exports: [PrismaModule],
})
export class SharedModule {}
