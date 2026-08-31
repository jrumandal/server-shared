import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

/**
 * Request logging interceptor for all micro-services.
 *
 * Logs each incoming request (method + path) and its duration on
 * completion. Apply globally in `main.ts` via `app.useGlobalInterceptors`.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      method?: string;
      url?: string;
    }>();
    // In the GraphQL context `getRequest()` can return `undefined`, so guard
    // with optional chaining (same class of bug as `AllExceptionsFilter`).
    const method = request?.method ?? 'UNKNOWN';
    const url = request?.url ?? '/';
    const startedAt = Date.now();

    this.logger.log(`${method} ${url}`);

    return next.handle().pipe(
      tap(() => {
        this.logger.log(`${method} ${url} +${Date.now() - startedAt}ms`);
      }),
    );
  }
}
