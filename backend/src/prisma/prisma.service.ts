import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService) {
    super({ adapter: new PrismaPg({ connectionString: config.getOrThrow<string>('DATABASE_URL') }) });
  }

  /** Connects with a short retry loop so the API can start while PostgreSQL is still booting (Docker, dev). */
  async onModuleInit() {
    const attempts = 15;
    for (let i = 1; i <= attempts; i++) {
      try {
        await this.$connect();
        await this.$queryRaw`SELECT 1`;
        return;
      } catch (err) {
        if (i === attempts) throw err;
        this.logger.warn(`Database not reachable yet (attempt ${i}/${attempts}); retrying in 2s…`);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
