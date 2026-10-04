import { isValidPhone, normalizePhone, phoneSearchFragment } from './phone.js';
import { slugify, uniqueSlug, vehicleBaseSlug } from './slug.js';

describe('slug helpers', () => {
  it('creates readable vehicle slugs', () => {
    expect(vehicleBaseSlug({ make: 'Toyota', model: 'Fortuner', year: 2024 })).toBe('toyota-fortuner-2024');
    expect(vehicleBaseSlug({ make: 'Mercedes-Benz', model: 'C 200 / AMG', year: 2019 })).toBe('mercedes-benz-c-200-amg-2019');
  });

  it('strips unsafe characters', () => {
    expect(slugify('  Hello   World!! ')).toBe('hello-world');
  });

  it('appends a counter when the slug is taken', async () => {
    const taken = new Set(['toyota-hilux-2023', 'toyota-hilux-2023-2']);
    await expect(uniqueSlug('toyota-hilux-2023', async (s) => taken.has(s))).resolves.toBe('toyota-hilux-2023-3');
    await expect(uniqueSlug('kia-picanto-2023', async (s) => taken.has(s))).resolves.toBe('kia-picanto-2023');
  });
});

describe('phone helpers', () => {
  it.each(['0300 1234567', '+92 300 1234567', '0300-1234567', '(021) 3456-7890', '+44 20 7946 0958'])('accepts %s', (p) => {
    expect(isValidPhone(p)).toBe(true);
  });

  it.each(['12345', 'call me', '+92 300 1234567 ext 9999999999', ''])('rejects %s', (p) => {
    expect(isValidPhone(p)).toBe(false);
  });

  it('only treats phone-like search text as a phone search', () => {
    expect(phoneSearchFragment('0300 123')).toBe('300123');
    expect(phoneSearchFragment('+92 336')).toBe('92336');
    expect(phoneSearchFragment('E2E Seller 3')).toBeNull();
    expect(phoneSearchFragment('12')).toBeNull();
  });

  it('normalises Pakistani numbers to +92 format', () => {
    expect(normalizePhone('0300 1234567')).toBe('+923001234567');
    expect(normalizePhone('+92 336 844 0890')).toBe('+923368440890');
    expect(normalizePhone('0092 300 1234567')).toBe('+923001234567');
    expect(normalizePhone('923001234567')).toBe('+923001234567');
  });
});
