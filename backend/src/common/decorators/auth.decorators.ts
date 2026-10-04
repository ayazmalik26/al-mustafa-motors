import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Role } from '../../generated/prisma/client.js';
import type { AuthUser } from '../types/auth-user.js';

export const IS_PUBLIC_KEY = 'isPublic';
/** Marks a route as accessible without authentication. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
/** Restricts a route to the given roles (authentication is always required unless @Public). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const RAW_RESPONSE_KEY = 'rawResponse';
/** Skips the `{ success, data }` envelope (for XML/text responses). */
export const RawResponse = () => SetMetadata(RAW_RESPONSE_KEY, true);

/** Injects the authenticated user into a controller handler. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser | undefined => {
  return ctx.switchToHttp().getRequest().user;
});
