import { en } from '../i18n/translations/en';
import { ur } from '../i18n/translations/ur';
import { interpolate } from '../i18n/format';
import { enquiryFollowUpMessage, formatPhone, sellWhatsAppMessage, telLink, vehicleWhatsAppMessage, whatsappDigits, whatsappLink } from './whatsapp';

const trEn = (key: string, params?: Record<string, string | number>) => interpolate((en as Record<string, string>)[key] ?? key, params);
const trUr = (key: string, params?: Record<string, string | number>) => interpolate((ur as Record<string, string>)[key] ?? key, params);

const fortuner = { title: 'Toyota Fortuner', year: 2024, condition: 'USED' as const, slug: 'toyota-fortuner-2024' };

describe('WhatsApp integration', () => {
  it('builds wa.me links from formatted numbers', () => {
    expect(whatsappDigits('+92 336 844-0890')).toBe('923368440890');
    expect(whatsappLink('+92 336 8440890')).toBe('https://wa.me/923368440890');
    expect(whatsappLink(null, 'hi')).toBeNull();
  });

  it('URL-encodes the message (spaces, new lines, ampersands, Urdu)', () => {
    const link = whatsappLink('+923368440890', 'Hi & salam\nکیا')!;
    expect(link).toBe(`https://wa.me/923368440890?text=${encodeURIComponent('Hi & salam\nکیا')}`);
    expect(link).not.toContain(' ');
    expect(decodeURIComponent(link.split('text=')[1])).toBe('Hi & salam\nکیا');
  });

  it('pre-fills the vehicle enquiry in the agreed format', () => {
    expect(vehicleWhatsAppMessage(fortuner, trEn)).toBe(
      ['Assalam o Alaikum,', '', 'I am interested in:', '', 'Toyota Fortuner', '2024', 'Used', '', 'Is this vehicle available?', '', 'Thank you.'].join('\n'),
    );
  });

  it('includes the vehicle link when the site URL is known', () => {
    expect(vehicleWhatsAppMessage(fortuner, trEn, 'https://almustafamotors.pk/')).toContain('https://almustafamotors.pk/inventory/toyota-fortuner-2024');
  });

  it('localises the message for Urdu visitors', () => {
    const msg = vehicleWhatsAppMessage(fortuner, trUr);
    expect(msg).toContain('السلام علیکم');
    expect(msg).toContain('استعمال شدہ');
    expect(msg).toContain('Toyota Fortuner');
  });

  it('summarises sell / exchange requests', () => {
    const msg = sellWhatsAppMessage({ intent: 'EXCHANGE', name: 'Sara', vehicle: 'Honda City 2019', mileage: '82,000 km', reference: 'AB12CD34' }, trEn);
    expect(msg).toContain('I would like to exchange my car.');
    expect(msg).toContain('Vehicle: Honda City 2019');
    expect(msg).toContain('Mileage: 82,000 km');
    expect(msg).toContain('Reference: AB12CD34');
    expect(msg).not.toContain('Expected price');
  });

  it('references the enquiry in the follow-up message', () => {
    expect(enquiryFollowUpMessage({ name: 'Ali', vehicleTitle: 'Kia Sportage 2024', reference: 'XYZ' }, trEn)).toContain('Vehicle: Kia Sportage 2024');
  });

  it('formats phone numbers for display and tel: links', () => {
    expect(formatPhone('+923118382992')).toBe('+92 311 8382992');
    expect(formatPhone('03001234567')).toBe('0300 1234567');
    expect(formatPhone('+44 20 7946 0958')).toBe('+44 20 7946 0958');
    expect(telLink('+92 311 838-2992')).toBe('tel:+923118382992');
    expect(telLink('')).toBeNull();
  });
});
