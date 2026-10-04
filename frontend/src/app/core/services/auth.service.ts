import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, firstValueFrom, map, of, tap, type Observable } from 'rxjs';
import { API_BASE, unwrap } from '../http/api';
import type { ApiSuccess } from '../models/api.models';
import type { AuthUser, Role } from '../models/settings.models';

export type SessionStatus = 'unknown' | 'authenticated' | 'anonymous';

/**
 * Admin session. The JWT lives in an httpOnly cookie set by the API, so the browser
 * never sees the token; this service only tracks who is signed in.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  readonly user = signal<AuthUser | null>(null);
  readonly status = signal<SessionStatus>('unknown');
  readonly isAuthenticated = computed(() => this.status() === 'authenticated');
  readonly isAdmin = computed(() => this.user()?.role === 'ADMIN');

  private pending: Promise<AuthUser | null> | null = null;

  /** Resolves the current session once (subsequent calls reuse the result). */
  ensureSession(): Promise<AuthUser | null> {
    if (this.status() !== 'unknown') return Promise.resolve(this.user());
    this.pending ??= firstValueFrom(
      this.http.get<ApiSuccess<{ user: AuthUser }>>(`${API_BASE}/auth/me`).pipe(
        unwrap(),
        map((r) => r.user),
        catchError(() => of(null)),
      ),
    ).then((user) => {
      this.setUser(user);
      this.pending = null;
      return user;
    });
    return this.pending;
  }

  login(email: string, password: string): Observable<AuthUser> {
    return this.http.post<ApiSuccess<{ user: AuthUser; expiresAt: string }>>(`${API_BASE}/auth/login`, { email, password }).pipe(
      unwrap(),
      map((r) => r.user),
      tap((user) => this.setUser(user)),
    );
  }

  logout(): Observable<unknown> {
    return this.http.post(`${API_BASE}/auth/logout`, {}).pipe(
      catchError(() => of(null)),
      tap(() => this.setUser(null)),
    );
  }

  /** Called when the API reports the session is gone (401). */
  clearSession() {
    this.setUser(null);
  }

  hasRole(...roles: Role[]): boolean {
    const user = this.user();
    return !!user && roles.includes(user.role);
  }

  private setUser(user: AuthUser | null) {
    this.user.set(user);
    this.status.set(user ? 'authenticated' : 'anonymous');
  }
}
