import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Response } from 'express';
import { CurrentUser, Public } from '../../common/decorators/auth.decorators.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { SESSION_COOKIE } from './auth.constants.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.get<boolean>('COOKIE_SECURE') ?? false,
      sameSite: 'strict',
      path: '/',
    };
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { user, token, expiresAt } = await this.auth.login(dto.email, dto.password);
    res.cookie(SESSION_COOKIE, token, { ...this.cookieOptions(), expires: expiresAt });
    return { user, expiresAt };
  }

  @Public()
  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(SESSION_COOKIE, this.cookieOptions());
    return { loggedOut: true };
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return { user };
  }
}
