import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { InjectionToken, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { API_BASE } from './api';

/**
 * Origin the server-side renderer uses to reach the API directly (e.g. http://localhost:3000).
 * Only provided in the server config; in the browser requests stay relative (/api/...).
 */
export const API_INTERNAL_ORIGIN = new InjectionToken<string | null>('API_INTERNAL_ORIGIN', { factory: () => null });

/** During SSR, rewrites relative API URLs to the internal API origin. */
export const apiUrlInterceptor: HttpInterceptorFn = (req, next) => {
  const origin = inject(API_INTERNAL_ORIGIN);
  if (origin && req.url.startsWith(API_BASE)) {
    return next(req.clone({ url: `${origin.replace(/\/+$/, '')}${req.url}` }));
  }
  return next(req);
};

/** When an admin API call returns 401, the session has expired: clear it and go to the login page. */
export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthService);
  return next(req).pipe(
    catchError((err: unknown) => {
      const isAuthCall = req.url.includes('/auth/login') || req.url.includes('/auth/me');
      if (err instanceof HttpErrorResponse && err.status === 401 && !isAuthCall && router.url.startsWith('/admin')) {
        auth.clearSession();
        void router.navigate(['/admin/login'], { queryParams: { returnUrl: router.url, expired: 1 } });
      }
      return throwError(() => err);
    }),
  );
};
