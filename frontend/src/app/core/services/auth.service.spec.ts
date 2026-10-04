import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter, type ActivatedRouteSnapshot, type RouterStateSnapshot } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from '../guards/auth.guards';
import { AuthService } from './auth.service';

const admin = { id: 'u1', name: 'Admin', email: 'admin@test.local', role: 'ADMIN' as const };
const staff = { ...admin, id: 'u2', role: 'STAFF' as const };

describe('AuthService & guards', () => {
  let http: HttpTestingController;
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => http.verify());

  const runGuard = (guard: typeof authGuard, url = '/admin/vehicles') =>
    TestBed.runInInjectionContext(() => guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot)) as Promise<boolean | UrlTree>;

  it('loads the session once from /api/auth/me', async () => {
    const first = auth.ensureSession();
    const second = auth.ensureSession();
    http.expectOne('/api/auth/me').flush({ success: true, data: { user: admin } });
    expect(await first).toEqual(admin);
    expect(await second).toEqual(admin);
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.isAdmin()).toBe(true);
  });

  it('treats a 401 from /me as signed out', async () => {
    const p = auth.ensureSession();
    http.expectOne('/api/auth/me').flush({ success: false, message: 'no' }, { status: 401, statusText: 'Unauthorized' });
    expect(await p).toBeNull();
    expect(auth.status()).toBe('anonymous');
  });

  it('logs in and out (the token stays in an httpOnly cookie, never in JS)', () => {
    let user: unknown;
    auth.login('admin@test.local', 'secret').subscribe((u) => (user = u));
    const req = http.expectOne('/api/auth/login');
    expect(req.request.body).toEqual({ email: 'admin@test.local', password: 'secret' });
    req.flush({ success: true, data: { user: admin, expiresAt: new Date().toISOString() } });
    expect(user).toEqual(admin);
    expect(localStorage.length).toBe(0);

    auth.logout().subscribe();
    http.expectOne('/api/auth/logout').flush({ success: true, data: { loggedOut: true } });
    expect(auth.user()).toBeNull();
  });

  it('authGuard redirects anonymous visitors to the login page with a return URL', async () => {
    const result = runGuard(authGuard);
    http.expectOne('/api/auth/me').flush({}, { status: 401, statusText: 'Unauthorized' });
    const tree = (await result) as UrlTree;
    expect(router.serializeUrl(tree)).toBe('/admin/login?returnUrl=%2Fadmin%2Fvehicles');
  });

  it('authGuard lets signed-in users through', async () => {
    const result = runGuard(authGuard);
    http.expectOne('/api/auth/me').flush({ success: true, data: { user: staff } });
    expect(await result).toBe(true);
  });

  it('roleGuard blocks staff from admin-only pages', async () => {
    const result = runGuard(roleGuard('ADMIN'), '/admin/settings');
    http.expectOne('/api/auth/me').flush({ success: true, data: { user: staff } });
    expect(router.serializeUrl((await result) as UrlTree)).toBe('/admin');
  });

  it('roleGuard allows admins', async () => {
    const result = runGuard(roleGuard('ADMIN'), '/admin/settings');
    http.expectOne('/api/auth/me').flush({ success: true, data: { user: admin } });
    expect(await result).toBe(true);
  });

  it('guestGuard sends signed-in users from the login page to the dashboard', async () => {
    const result = runGuard(guestGuard, '/admin/login');
    http.expectOne('/api/auth/me').flush({ success: true, data: { user: admin } });
    expect(router.serializeUrl((await result) as UrlTree)).toBe('/admin');
  });
});
