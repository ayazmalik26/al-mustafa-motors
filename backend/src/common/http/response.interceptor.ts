import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, Observable } from 'rxjs';
import { RAW_RESPONSE_KEY } from '../decorators/auth.decorators.js';
import { ApiSuccess, Paginated } from './api-response.js';

/** Wraps every successful JSON response as `{ success: true, data, meta? }`. */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiSuccess<unknown> | unknown> {
    if (this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE_KEY, [context.getHandler(), context.getClass()])) {
      return next.handle();
    }
    return next.handle().pipe(
      map((body) => {
        if (body instanceof Paginated) return { success: true as const, data: body.items, meta: body.meta };
        return { success: true as const, data: body ?? null };
      }),
    );
  }
}
