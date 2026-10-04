import type { Lang } from '../models/lead.models';

const LAKH = 100_000;
const CRORE = 10_000_000;

const numberFormat = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 });
const decimalFormat = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 2 });

/** 12500000 → "12,500,000" (Latin digits in both languages for clarity). */
export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

/** Full rupee amount: "PKR 12,500,000" / "12,500,000 روپے". */
export function formatPkr(value: number, lang: Lang): string {
  const n = formatNumber(value);
  return lang === 'ur' ? `${n} روپے` : `PKR ${n}`;
}

/** Pakistani short form: "PKR 1.25 crore", "PKR 95 lakh" / "1.25 کروڑ روپے". */
export function formatPkrCompact(value: number, lang: Lang): string {
  let amount: string;
  if (value >= CRORE) amount = `${decimalFormat.format(value / CRORE)} ${lang === 'ur' ? 'کروڑ' : 'crore'}`;
  else if (value >= LAKH) amount = `${decimalFormat.format(value / LAKH)} ${lang === 'ur' ? 'لاکھ' : 'lakh'}`;
  else amount = formatNumber(value);
  return lang === 'ur' ? `${amount} روپے` : `PKR ${amount}`;
}

/** "42,000 km" / "42,000 کلومیٹر". */
export function formatKm(value: number, lang: Lang): string {
  return `${formatNumber(value)} ${lang === 'ur' ? 'کلومیٹر' : 'km'}`;
}

export function formatDate(value: string | Date, lang: Lang, style: 'medium' | 'long' = 'medium'): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(lang === 'ur' ? 'ur-PK' : 'en-GB', { dateStyle: style, timeZone: 'Asia/Karachi' }).format(date);
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Karachi' }).format(date);
}

export function interpolate(template: string, params?: Record<string, string | number | null | undefined>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (params[key] != null ? String(params[key]) : match));
}
