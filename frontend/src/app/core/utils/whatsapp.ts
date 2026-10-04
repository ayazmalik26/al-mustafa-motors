import type { Vehicle } from '../models/vehicle.models';

/** Loose translate function (see I18nService.tr). */
export type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

/** Digits only, for wa.me links (which do not accept "+", spaces or dashes). */
export function whatsappDigits(phone: string | null | undefined): string {
  return (phone ?? '').replace(/\D/g, '');
}

/** https://wa.me/<number>?text=<encoded message> — returns null when no number is configured. */
export function whatsappLink(phone: string | null | undefined, message?: string): string | null {
  const digits = whatsappDigits(phone);
  if (!digits) return null;
  return message ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : `https://wa.me/${digits}`;
}

/** Human-friendly display: "+923118382992" → "+92 311 8382992". Other formats are returned unchanged. */
export function formatPhone(phone: string | null | undefined): string {
  const value = (phone ?? '').trim();
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('92') && digits.length === 12) return `+92 ${digits.slice(2, 5)} ${digits.slice(5)}`;
  if (digits.startsWith('03') && digits.length === 11) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return value;
}

/** tel: link with only + and digits. */
export function telLink(phone: string | null | undefined): string | null {
  const cleaned = (phone ?? '').replace(/[^\d+]/g, '');
  return cleaned ? `tel:${cleaned}` : null;
}

/**
 * Pre-filled vehicle enquiry, e.g.
 *
 *   Assalam o Alaikum,
 *
 *   I am interested in:
 *
 *   Toyota Fortuner Legender
 *   2024
 *   Used
 *
 *   https://…/inventory/toyota-fortuner-2024
 *
 *   Is this vehicle available?
 *
 *   Thank you.
 */
export function vehicleWhatsAppMessage(
  vehicle: Pick<Vehicle, 'title' | 'year' | 'condition' | 'slug'>,
  tr: TranslateFn,
  siteUrl?: string | null,
): string {
  const lines = [
    tr('wa.greeting'),
    '',
    tr('wa.interestedIn'),
    '',
    vehicle.title,
    String(vehicle.year),
    tr(`wa.condition.${vehicle.condition}`),
  ];
  if (siteUrl) lines.push('', `${siteUrl.replace(/\/+$/, '')}/inventory/${vehicle.slug}`);
  lines.push('', tr('wa.isAvailable'), '', tr('wa.thanks'));
  return lines.join('\n');
}

export interface SellMessageInput {
  intent: 'SELL' | 'EXCHANGE';
  name: string;
  vehicle: string;
  mileage?: string | null;
  expectedPrice?: string | null;
  reference?: string | null;
}

export function sellWhatsAppMessage(input: SellMessageInput, tr: TranslateFn): string {
  const lines = [tr('wa.greeting'), tr(`wa.sellIntro.${input.intent}`), '', tr('wa.name', { value: input.name }), tr('wa.vehicle', { value: input.vehicle })];
  if (input.mileage) lines.push(tr('wa.mileage', { value: input.mileage }));
  if (input.expectedPrice) lines.push(tr('wa.expectedPrice', { value: input.expectedPrice }));
  if (input.reference) lines.push(tr('wa.reference', { value: input.reference }));
  lines.push('', tr('wa.thanks'));
  return lines.join('\n');
}

export function enquiryFollowUpMessage(input: { name: string; vehicleTitle?: string | null; reference: string }, tr: TranslateFn): string {
  const lines = [tr('wa.greeting'), tr('wa.enquirySent'), '', tr('wa.name', { value: input.name })];
  if (input.vehicleTitle) lines.push(tr('wa.vehicle', { value: input.vehicleTitle }));
  lines.push(tr('wa.reference', { value: input.reference }), '', tr('wa.thanks'));
  return lines.join('\n');
}
