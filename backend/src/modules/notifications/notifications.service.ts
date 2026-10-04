import { Inject, Injectable, Logger, Optional } from '@nestjs/common';

export type LeadNotification =
  | { type: 'enquiry'; id: string; name: string; phone: string; vehicleTitle?: string | null }
  | { type: 'sell-request'; id: string; name: string; phone: string; vehicle: string; intent: string };

/** A delivery channel (email, SMS, WhatsApp Business API, CRM webhook…). */
export interface NotificationChannel {
  readonly name: string;
  send(notification: LeadNotification): Promise<void>;
}

export const NOTIFICATION_CHANNELS = Symbol('NOTIFICATION_CHANNELS');

/**
 * Fan-out point for "new lead" events. Today it only logs; adding email/SMS/WhatsApp
 * notifications means registering a NotificationChannel provider — callers do not change.
 * Delivery failures never break the customer's request.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('Notifications');

  constructor(@Optional() @Inject(NOTIFICATION_CHANNELS) private readonly channels: NotificationChannel[] = []) {}

  notify(notification: LeadNotification): void {
    this.logger.log(`New ${notification.type} ${notification.id} from ${notification.name}`);
    for (const channel of this.channels ?? []) {
      channel.send(notification).catch((err: Error) => this.logger.warn(`${channel.name} failed: ${err.message}`));
    }
  }
}
