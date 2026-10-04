import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import type { Role } from '../models/settings.models';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

/** Admin area: requires a signed-in user; otherwise redirects to the login page (remembering where to return). */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = await auth.ensureSession();
  return user ? true : router.createUrlTree(['/admin/login'], { queryParams: { returnUrl: state.url } });
};

/** Restricts a route to specific roles (e.g. settings → ADMIN only). */
export const roleGuard =
  (...roles: Role[]): CanActivateFn =>
  async () => {
    // Resolve every dependency before awaiting — inject() only works synchronously.
    const auth = inject(AuthService);
    const router = inject(Router);
    const toast = inject(ToastService);
    const user = await auth.ensureSession();
    if (user && roles.includes(user.role)) return true;
    toast.error('Only administrators can open that page.');
    return router.createUrlTree(['/admin']);
  };

/** Login page: skip it when already signed in. */
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = await auth.ensureSession();
  return user ? router.createUrlTree(['/admin']) : true;
};
