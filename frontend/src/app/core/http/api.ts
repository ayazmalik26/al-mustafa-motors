import { HttpErrorResponse } from '@angular/common/http';
import { map, type OperatorFunction } from 'rxjs';
import type { ApiErrorBody, ApiSuccess, AppError, Paged } from '../models/api.models';

/** Root of the REST API. Rewritten to an absolute internal URL during SSR (see apiUrlInterceptor). */
export const API_BASE = '/api';

export const unwrap = <T>(): OperatorFunction<ApiSuccess<T>, T> => map((res) => res.data);

export const unwrapPage = <T>(): OperatorFunction<ApiSuccess<T[]>, Paged<T>> =>
  map((res) => ({ items: res.data, meta: res.meta ?? { page: 1, pageSize: res.data.length, total: res.data.length, totalPages: 1 } }));

/** Converts any HttpClient error into a small, predictable shape. */
export function toAppError(err: unknown): AppError {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as Partial<ApiErrorBody> | null;
    if (body && typeof body === 'object' && body.success === false) {
      return { status: err.status, message: body.message ?? 'Request failed', fieldErrors: body.errors };
    }
    return { status: err.status, message: err.status === 0 ? 'network' : err.message };
  }
  return { status: 0, message: err instanceof Error ? err.message : 'Unknown error' };
}

/** Builds HttpParams-compatible objects, dropping empty values. */
export function cleanParams(params: object): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    out[key] = String(value);
  }
  return out;
}
