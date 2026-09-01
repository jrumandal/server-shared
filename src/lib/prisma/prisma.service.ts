import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Shared Prisma service for all NestJS micro-services.
 *
 * Wraps a single `PrismaClient` instance per process and manages its
 * lifecycle (connect on module init, disconnect on module destroy).
 *
 * Services import this via `PrismaModule` (see `prisma.module.ts`) and
 * inject `PrismaService` wherever they need database access.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'production'
          ? ['error', 'warn']
          : ['query', 'error', 'warn'],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
