import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Meta, Title } from '@angular/platform-browser';
import { SettingsService } from '../../core/services/settings.service';
import { VehicleDetailPage } from './vehicle-detail.page';

const fortuner = {
  id: '22222222-2222-4222-8222-222222222222',
  slug: 'toyota-fortuner-2024',
  title: 'Toyota Fortuner Legender',
  make: 'Toyota',
  model: 'Fortuner',
  variant: 'Legender',
  year: 2024,
  condition: 'USED',
  bodyType: 'SUV',
  fuelType: 'DIESEL',
  transmission: 'AUTOMATIC',
  mileage: 18000,
  engine: '2.8L Diesel',
  color: 'White',
  price: null,
  priceDisplay: null,
  status: 'RESERVED',
  description: 'Seven seats.',
  featured: true,
  isDemo: true,
  soldAt: null,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
  images: [
    { id: 'i1', url: 'https://images.unsplash.com/photo-1?w=1600', thumbUrl: null, alt: 'Front', width: null, height: null, sortOrder: 0, isPrimary: true },
    { id: 'i2', url: '/uploads/vehicles/x-lg.webp', thumbUrl: '/uploads/vehicles/x-sm.webp', alt: 'Side', width: 1600, height: 1000, sortOrder: 1, isPrimary: false },
  ],
  primaryImage: null,
  imageCount: 2,
};

describe('VehicleDetailPage', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([{ path: 'inventory/:slug', component: VehicleDetailPage }])],
    });
    TestBed.inject(SettingsService).settings.set({
      businessName: 'Al-Mustafa Motors',
      whatsapp: '+923368440890',
      phone: '+923118382992',
      siteUrl: 'https://example.pk',
    } as never);
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  async function open(vehicle = fortuner) {
    await harness.navigateByUrl(`/inventory/${vehicle.slug}`);
    http.expectOne(`/api/vehicles/${vehicle.slug}`).flush({ success: true, data: { ...vehicle, primaryImage: vehicle.images[0] } });
    await harness.fixture.whenStable();
    http.match((r) => r.url === '/api/vehicles').forEach((r) => r.flush({ success: true, data: [], meta: { page: 1, pageSize: 3, total: 0, totalPages: 1 } }));
    await harness.fixture.whenStable();
    return harness.routeNativeElement!;
  }

  it('renders the full specification list', async () => {
    const el = await open();
    const specs = el.querySelector('[data-testid="vehicle-specs"]')!.textContent!;
    for (const value of ['Toyota', 'Fortuner', 'Legender', '2024', 'Used', '18,000 km', 'Diesel', 'Automatic', '2.8L Diesel', 'White', 'SUV', 'Reserved']) {
      expect(specs).toContain(value);
    }
  });

  it('shows "Price on request" when no price is set and flags reserved/demo listings', async () => {
    const el = await open();
    expect(el.querySelector('[data-testid="vehicle-price-detail"]')!.textContent).toContain('Price on request');
    expect(el.textContent).toContain('currently reserved');
    expect(el.querySelector('[data-testid="demo-disclaimer"]')).not.toBeNull();
  });

  it('builds WhatsApp and call links from the business settings', async () => {
    const el = await open();
    const wa = el.querySelector<HTMLAnchorElement>('[data-testid="vehicle-whatsapp"]')!.href;
    expect(wa.startsWith('https://wa.me/923368440890?text=')).toBe(true);
    const text = decodeURIComponent(wa.split('text=')[1]);
    expect(text).toContain('Toyota Fortuner Legender\n2024\nUsed');
    expect(text).toContain('https://example.pk/inventory/toyota-fortuner-2024');
    expect(el.querySelector<HTMLAnchorElement>('[data-testid="vehicle-call"]')!.getAttribute('href')).toBe('tel:+923118382992');
  });

  it('sets SEO title, canonical URL and Open Graph tags (and noindex for demo data)', async () => {
    await open();
    expect(TestBed.inject(Title).getTitle()).toBe('Toyota Fortuner Legender 2024 — Al-Mustafa Motors Karachi');
    const meta = TestBed.inject(Meta);
    expect(meta.getTag('property="og:url"')!.content).toBe('https://example.pk/inventory/toyota-fortuner-2024');
    expect(meta.getTag('property="og:image"')!.content).toContain('images.unsplash.com');
    expect(meta.getTag('name="robots"')!.content).toBe('noindex, nofollow');
    expect(document.head.querySelector('link[rel="canonical"]')!.getAttribute('href')).toBe('https://example.pk/inventory/toyota-fortuner-2024');
    expect(document.head.querySelector('script[type="application/ld+json"]')!.textContent).toContain('"@type":"Car"');
  });

  it('shows a not-found state for unknown vehicles', async () => {
    await harness.navigateByUrl('/inventory/nope');
    http.expectOne('/api/vehicles/nope').flush({ success: false, statusCode: 404, message: 'Vehicle not found' }, { status: 404, statusText: 'Not Found' });
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement!.textContent).toContain('Vehicle not found');
  });
});
