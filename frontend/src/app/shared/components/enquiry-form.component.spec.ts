import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { SettingsService } from '../../core/services/settings.service';
import { EnquiryFormComponent } from './enquiry-form.component';

describe('EnquiryFormComponent', () => {
  let fixture: ComponentFixture<EnquiryFormComponent>;
  let http: HttpTestingController;
  let el: HTMLElement;

  const vehicle = { id: '11111111-1111-4111-8111-111111111111', title: 'Toyota Fortuner Legender', year: 2024, slug: 'toyota-fortuner-2024' };

  const type = (selector: string, value: string) => {
    const input = el.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
  };
  const submit = async () => {
    el.querySelector<HTMLButtonElement>('[data-testid="enquiry-submit"]')!.click();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    TestBed.inject(SettingsService).settings.set({ whatsapp: '+923368440890', businessName: 'Al-Mustafa Motors' } as never);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EnquiryFormComponent);
    fixture.componentRef.setInput('vehicle', vehicle);
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('attaches the vehicle and pre-fills a message', () => {
    expect(el.textContent).toContain('About: Toyota Fortuner Legender 2024');
    expect(el.querySelector<HTMLTextAreaElement>('textarea')!.value).toContain('Toyota Fortuner Legender 2024');
  });

  it('requires name and phone and validates email / message length', async () => {
    type('textarea', 'short');
    type('input[type="email"]', 'nope');
    await submit();
    const text = el.textContent!;
    expect(text).toContain('Please enter your name.');
    expect(text).toContain('Please enter your phone number.');
    expect(text).toContain('Enter a valid email address.');
    expect(text).toContain('Please write at least 10 characters.');
    http.expectNone('/api/enquiries');
  });

  it('rejects malformed phone numbers', async () => {
    type('input[autocomplete="name"]', 'Ali');
    type('input[type="tel"]', '12ab');
    await submit();
    expect(el.textContent).toContain('Enter a valid phone number');
  });

  it('posts the enquiry with the vehicle id and shows success with a WhatsApp follow-up', async () => {
    type('input[autocomplete="name"]', 'Ahmed Khan');
    type('input[type="tel"]', '0300 1234567');
    await submit();

    const req = http.expectOne('/api/enquiries');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toMatchObject({ name: 'Ahmed Khan', phone: '0300 1234567', vehicleId: vehicle.id, source: 'VEHICLE_PAGE', locale: 'en' });
    expect(req.request.body.email).toBeUndefined();
    req.flush({ success: true, data: { id: 'abcdef12-0000-4000-8000-000000000000', status: 'NEW', createdAt: new Date().toISOString(), vehicleTitle: 'Toyota Fortuner Legender 2024' } });
    await fixture.whenStable();

    expect(el.querySelector('[data-testid="enquiry-success"]')).not.toBeNull();
    const wa = el.querySelector<HTMLAnchorElement>('[data-testid="enquiry-whatsapp"]')!.href;
    expect(wa).toContain('https://wa.me/923368440890?text=');
    expect(decodeURIComponent(wa)).toContain('Reference: ABCDEF12');
  });

  it('shows server field errors next to the fields', async () => {
    type('input[autocomplete="name"]', 'Ahmed Khan');
    type('input[type="tel"]', '0300 1234567');
    await submit();
    http
      .expectOne('/api/enquiries')
      .flush({ success: false, statusCode: 400, message: 'Validation failed', errors: { phone: ['Phone number rejected by server'] } }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();
    expect(el.textContent).toContain('Phone number rejected by server');
    expect(el.textContent).toContain('Please check the highlighted fields.');
  });
});
