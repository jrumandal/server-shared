import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';

/**
 * Global exception filter for all micro-services.
 *
 * Catches every thrown exception and returns a consistent JSON error
 * envelope. Apply globally in `main.ts` via `app.useGlobalFilters`.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    // `getResponse()` is typed `any` by NestJS; we only use the Express API.
    const response = ctx.getResponse();
    const request = ctx.getRequest<{ url?: string; method?: string }>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;

    const body =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const message =
      typeof body === 'string'
        ? body
        : ((body as { message?: unknown }).message ?? 'Internal server error');

    this.logger.error(
      `${request?.method ?? 'UNKNOWN'} ${request?.url ?? '/'} -> ${status}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    // In the GraphQL context `getResponse()` is not an Express response, so
    // guard before using the Express API. When it is unavailable we have
    // already logged the error above; the GraphQL layer will surface its own
    // error envelope to the client.
    if (
      typeof response?.status === 'function' &&
      typeof response?.json === 'function'
    ) {
      response.status(status).json({
        statusCode: status,
        error: message,
        message,
        path: request?.url ?? '/',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
