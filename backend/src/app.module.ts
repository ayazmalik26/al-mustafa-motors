import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env.validation.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { StorageModule } from './modules/storage/storage.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { AuthGuard } from './modules/auth/auth.guard.js';
import { VehiclesModule } from './modules/vehicles/vehicles.module.js';
import { EnquiriesModule } from './modules/enquiries/enquiries.module.js';
import { SellRequestsModule } from './modules/sell-requests/sell-requests.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { SeoController } from './modules/seo/seo.controller.js';
import { HealthController } from './modules/health/health.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // backend/.env first, then the shared root .env. Real environment variables always win.
      envFilePath: ['.env', '../.env'],
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [{ name: 'default', ttl: 60_000, limit: 300 }],
        skipIf: () => !config.get<boolean>('RATE_LIMIT_ENABLED', true),
      }),
    }),
    PrismaModule,
    StorageModule,
    NotificationsModule,
    AuthModule,
    VehiclesModule,
    EnquiriesModule,
    SellRequestsModule,
    SettingsModule,
    DashboardModule,
  ],
  controllers: [SeoController, HealthController],
  providers: [
    // Order matters: rate limiting runs before authentication.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useExisting: AuthGuard },
  ],
})
export class AppModule {}
