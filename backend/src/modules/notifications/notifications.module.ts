import { Global, Module } from '@nestjs/common';
import { NOTIFICATION_CHANNELS, NotificationsService } from './notifications.service.js';

@Global()
@Module({
  providers: [
    // Register channels here, e.g. { provide: NOTIFICATION_CHANNELS, useFactory: (...) => [new EmailChannel(...)] }
    { provide: NOTIFICATION_CHANNELS, useValue: [] },
    NotificationsService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
