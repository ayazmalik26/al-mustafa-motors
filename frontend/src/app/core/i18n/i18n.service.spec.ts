import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { I18nService, LANG_STORAGE_KEY } from './i18n.service';
import { formatKm, formatPkr, formatPkrCompact } from './format';
import { en } from './translations/en';
import { ur } from './translations/ur';

describe('I18nService (English / Urdu)', () => {
  let i18n: I18nService;
  let doc: Document;

  beforeEach(() => {
    localStorage.clear();
    document.cookie = 'am_lang=; max-age=0; path=/';
    TestBed.configureTestingModule({});
    i18n = TestBed.inject(I18nService);
    doc = TestBed.inject(DOCUMENT);
  });

  it('defaults to English, left-to-right', () => {
    expect(i18n.lang()).toBe('en');
    expect(doc.documentElement.getAttribute('dir')).toBe('ltr');
    expect(i18n.t('nav.inventory')).toBe('Inventory');
  });

  it('switches to Urdu: translations, RTL direction, lang attribute and stored preference', () => {
    i18n.setLang('ur');
    expect(i18n.t('nav.inventory')).toBe('گاڑیاں');
    expect(i18n.dir()).toBe('rtl');
    expect(doc.documentElement.getAttribute('dir')).toBe('rtl');
    expect(doc.documentElement.getAttribute('lang')).toBe('ur');
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('ur');
    expect(document.cookie).toContain('am_lang=ur');
  });

  it('restores the stored preference on startup', () => {
    localStorage.setItem(LANG_STORAGE_KEY, 'ur');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    expect(TestBed.inject(I18nService).lang()).toBe('ur');
  });

  it('interpolates parameters', () => {
    expect(i18n.t('inventory.results', { count: 12 })).toBe('12 vehicles');
    i18n.setLang('ur');
    expect(i18n.t('inventory.results', { count: 12 })).toBe('12 گاڑیاں');
  });

  it('translates enum values (vehicle UI labels)', () => {
    expect(i18n.enumLabel('bodyType', 'SUV')).toBe('SUV');
    expect(i18n.enumLabel('status', 'SOLD')).toBe('Sold');
    i18n.setLang('ur');
    expect(i18n.enumLabel('transmission', 'AUTOMATIC')).toBe('آٹومیٹک');
    expect(i18n.enumLabel('condition', 'BRAND_NEW')).toBe('نئی');
  });

  it('never invents a price: unknown price shows "Price on request"', () => {
    expect(i18n.price({ price: null, priceDisplay: null })).toBe('Price on request');
    expect(i18n.price({ price: 17_500_000, priceDisplay: null })).toBe('PKR 1.75 crore');
    expect(i18n.price({ price: 17_500_000, priceDisplay: 'Call us' })).toBe('Call us');
    i18n.setLang('ur');
    expect(i18n.price({ price: null, priceDisplay: null })).toBe('قیمت کے لیے رابطہ کریں');
  });

  it('pins the document to English for the admin panel and restores it', () => {
    i18n.setLang('ur');
    i18n.setDocumentOverride('en');
    expect(doc.documentElement.getAttribute('dir')).toBe('ltr');
    i18n.setDocumentOverride(null);
    expect(doc.documentElement.getAttribute('dir')).toBe('rtl');
  });

  it('has a non-empty Urdu translation for every English key', () => {
    const missing = Object.keys(en).filter((key) => !(ur as Record<string, string>)[key]?.trim());
    expect(missing).toEqual([]);
  });
});

describe('number formatting', () => {
  it('formats rupees in full and in lakh/crore', () => {
    expect(formatPkr(12_500_000, 'en')).toBe('PKR 12,500,000');
    expect(formatPkr(12_500_000, 'ur')).toBe('12,500,000 روپے');
    expect(formatPkrCompact(4_350_000, 'en')).toBe('PKR 43.5 lakh');
    expect(formatPkrCompact(10_000_000, 'en')).toBe('PKR 1 crore');
    expect(formatPkrCompact(95_000, 'en')).toBe('PKR 95,000');
    expect(formatPkrCompact(13_200_000, 'ur')).toBe('1.32 کروڑ روپے');
  });

  it('formats mileage', () => {
    expect(formatKm(42000, 'en')).toBe('42,000 km');
    expect(formatKm(42000, 'ur')).toBe('42,000 کلومیٹر');
  });
});
