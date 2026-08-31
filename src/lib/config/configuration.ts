/**
 * Typed application configuration for all micro-services.
 *
 * Loaded by `AppConfigModule` (see `config.module.ts`) and exposed via
 * NestJS `ConfigService`. Values are read from environment variables so
 * each service can be configured independently (port, env, DB URL, ...).
 */
export interface AppConfig {
  /** Service name (used in logs / health). */
  serviceName: string;
  /** HTTP port the service listens on. */
  port: number;
  /** Runtime environment. */
  env: 'development' | 'production' | 'test';
  /** PostgreSQL connection string (Prisma). */
  databaseUrl?: string;
}

export default (): AppConfig => ({
  serviceName: process.env.SERVICE_NAME ?? 'service',
  port: parseInt(process.env.PORT ?? '4001', 10),
  env: (process.env.NODE_ENV as AppConfig['env']) ?? 'development',
  databaseUrl: process.env.DATABASE_URL,
});
