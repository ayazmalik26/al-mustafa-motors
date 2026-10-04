import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthUser, JwtPayload } from '../../common/types/auth-user.js';
import { dummyPasswordHash } from './auth.constants.js';

export interface LoginResult {
  user: AuthUser;
  token: string;
  expiresAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  static hashPassword(password: string) {
    return bcrypt.hash(password, 12);
  }

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // Always run bcrypt so response time does not reveal whether the email exists.
    const valid = await bcrypt.compare(password, user?.passwordHash ?? dummyPasswordHash());
    if (!user || !valid || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const payload: JwtPayload = { sub: user.id, role: user.role };
    const token = await this.jwt.signAsync(payload);
    const { exp } = this.jwt.decode<{ exp: number }>(token);
    return { user: AuthService.toAuthUser(user), token, expiresAt: new Date(exp * 1000) };
  }

  /** Verifies a session token and re-loads the user so deactivated users and role changes apply immediately. */
  async verify(token: string): Promise<AuthUser> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Your session has expired. Please sign in again.');
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) throw new UnauthorizedException('Your session is no longer valid.');
    return AuthService.toAuthUser(user);
  }

  static toAuthUser(user: { id: string; name: string; email: string; role: AuthUser['role'] }): AuthUser {
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }
}
