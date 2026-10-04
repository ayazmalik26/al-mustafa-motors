import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/auth.decorators.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', database: 'up', time: new Date().toISOString() };
  }
}
