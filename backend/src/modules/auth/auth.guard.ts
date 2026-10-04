import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Role } from '../../generated/prisma/client.js';
import { IS_PUBLIC_KEY, ROLES_KEY } from '../../common/decorators/auth.decorators.js';
import { AuthService } from './auth.service.js';
import { SESSION_COOKIE } from './auth.constants.js';

/**
 * Global guard: every route requires a valid session unless marked @Public().
 * Accepts the httpOnly session cookie (browser) or an `Authorization: Bearer` token (API clients).
 * Also enforces @Roles(...).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const token = this.extractToken(req);
    if (!token) throw new UnauthorizedException('Please sign in to continue.');

    const user = await this.auth.verify(token);
    req.user = user;

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, targets);
    if (roles?.length && !roles.includes(user.role)) {
      throw new ForbiddenException('You do not have permission to perform this action.');
    }
    return true;
  }

  private extractToken(req: Request): string | undefined {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7).trim();
    return (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
  }
}
