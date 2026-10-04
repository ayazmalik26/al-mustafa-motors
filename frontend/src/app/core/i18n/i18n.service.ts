import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, REQUEST, computed, inject, signal } from '@angular/core';
import type { Lang } from '../models/lead.models';
import type { Vehicle } from '../models/vehicle.models';
import { BrowserStorage } from '../services/browser-storage.service';
import { en, type TranslationKey, type Translations } from './translations/en';
import { ur } from './translations/ur';
import { formatDate, formatKm, formatPkr, formatPkrCompact, interpolate } from './format';

export const LANG_STORAGE_KEY = 'am-lang';
export const LANG_COOKIE = 'am_lang';
const DICTIONARIES: Record<Lang, Translations> = { en, ur };

export type EnumGroup = 'condition' | 'status' | 'bodyType' | 'fuelType' | 'transmission' | 'intent' | 'sellCondition';
type Params = Record<string, string | number | null | undefined>;

const isLang = (value: unknown): value is Lang => value === 'en' || value === 'ur';

function readCookie(cookieHeader: string | null | undefined, name: string): string | null {
  const match = cookieHeader?.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Runtime translation service (English LTR / Urdu RTL).
 * The preference is stored in localStorage (and mirrored to a cookie so the
 * server renders the right language on the first request).
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly request = inject(REQUEST, { optional: true });
  private readonly storage = inject(BrowserStorage);
  private readonly documentOverride = signal<Lang | null>(null);

  readonly lang = signal<Lang>(this.detectInitialLang());
  readonly dir = computed(() => (this.lang() === 'ur' ? 'rtl' : 'ltr'));
  readonly isRtl = computed(() => this.lang() === 'ur');
  private readonly dictionary = computed(() => DICTIONARIES[this.lang()]);

  constructor() {
    this.applyToDocument();
  }

  setLang(lang: Lang): void {
    if (!isLang(lang)) return;
    this.lang.set(lang);
    this.storage.set(LANG_STORAGE_KEY, lang);
    if (this.isBrowser) {
      this.document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
    }
    this.applyToDocument();
  }

  toggle(): void {
    this.setLang(this.lang() === 'en' ? 'ur' : 'en');
  }

  /** Translates a key, interpolating {placeholders}. Falls back to English, then the key itself. */
  t(key: TranslationKey, params?: Params): string {
    const template = this.dictionary()[key] ?? en[key] ?? key;
    return interpolate(template, params);
  }

  /** Untyped variant for dynamically built keys (used by message builders). */
  readonly tr = (key: string, params?: Params): string => this.t(key as TranslationKey, params);

  /** Translates an enum value, e.g. enumLabel('bodyType', 'SUV') → "SUV" / "ایس یو وی". */
  enumLabel(group: EnumGroup, value: string | null | undefined): string {
    if (!value) return '';
    return this.t(`enum.${group}.${value}` as TranslationKey);
  }

  price(vehicle: Pick<Vehicle, 'price' | 'priceDisplay'>, compact = true): string {
    if (vehicle.priceDisplay) return vehicle.priceDisplay;
    if (vehicle.price == null) return this.t('vehicle.priceOnRequest');
    return compact ? formatPkrCompact(vehicle.price, this.lang()) : formatPkr(vehicle.price, this.lang());
  }

  money(value: number, compact = false): string {
    return compact ? formatPkrCompact(value, this.lang()) : formatPkr(value, this.lang());
  }

  km(value: number | null | undefined): string {
    return value == null ? this.t('common.notSpecified') : formatKm(value, this.lang());
  }

  date(value: string | Date): string {
    return formatDate(value, this.lang());
  }

  /** Admin pages are English/LTR only; they pin the document language while open. */
  setDocumentOverride(lang: Lang | null): void {
    this.documentOverride.set(lang);
    this.applyToDocument();
  }

  private applyToDocument(): void {
    const lang = this.documentOverride() ?? this.lang();
    const root = this.document.documentElement;
    root.setAttribute('lang', lang);
    root.setAttribute('dir', lang === 'ur' ? 'rtl' : 'ltr');
  }

  private detectInitialLang(): Lang {
    if (this.isBrowser) {
      const stored = this.storage.get(LANG_STORAGE_KEY);
      if (isLang(stored)) return stored;
      const fromCookie = readCookie(this.document.cookie, LANG_COOKIE);
      return isLang(fromCookie) ? fromCookie : 'en';
    }
    const fromCookie = readCookie(this.request?.headers.get('cookie'), LANG_COOKIE);
    return isLang(fromCookie) ? fromCookie : 'en';
  }
}
