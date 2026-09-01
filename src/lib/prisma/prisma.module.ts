import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Global module that provides a shared `PrismaService` to the whole app.
 *
 * Because it is `@Global()`, services do not need to re-import it in each
 * feature module — they can inject `PrismaService` directly.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
