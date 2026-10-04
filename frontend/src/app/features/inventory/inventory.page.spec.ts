import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, type TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { Vehicle } from '../../core/models/vehicle.models';
import { InventoryPage } from './inventory.page';

const vehicle = (over: Partial<Vehicle>): Vehicle =>
  ({
    id: over.slug ?? 'id',
    slug: 'toyota-hilux-2023',
    title: 'Toyota Hilux Revo V',
    make: 'Toyota',
    model: 'Hilux',
    variant: 'Revo V',
    year: 2023,
    condition: 'USED',
    bodyType: 'PICKUP',
    fuelType: 'DIESEL',
    transmission: 'AUTOMATIC',
    mileage: 31500,
    engine: null,
    color: null,
    price: 13_200_000,
    priceDisplay: null,
    status: 'AVAILABLE',
    description: null,
    featured: true,
    isDemo: true,
    soldAt: null,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    images: [],
    primaryImage: null,
    imageCount: 0,
    ...over,
  }) as Vehicle;

const facets = {
  makes: [{ value: 'Toyota', count: 2 }, { value: 'Honda', count: 1 }],
  models: [{ make: 'Toyota', model: 'Hilux', count: 1 }],
  bodyTypes: [{ value: 'PICKUP', count: 1 }, { value: 'SUV', count: 1 }],
  fuelTypes: [],
  transmissions: [],
  conditions: [],
  statuses: [],
  years: { min: 2019, max: 2026 },
  price: { min: 1, max: 2 },
  mileage: { max: 100000 },
  total: 3,
};

describe('InventoryPage', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([{ path: 'inventory', component: InventoryPage }])],
    });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  const listRequest = (): TestRequest => http.expectOne((r) => r.url === '/api/vehicles');
  const flushFacets = () => http.expectOne('/api/vehicles/facets').flush({ success: true, data: facets });
  const page = (items: Vehicle[], total = items.length) => ({ success: true, data: items, meta: { page: 1, pageSize: 12, total, totalPages: Math.ceil(total / 12) || 1 } });

  it('loads vehicles using the filters from the URL', async () => {
    await harness.navigateByUrl('/inventory?make=Toyota&bodyType=PICKUP&sort=price_asc');
    flushFacets();
    const req = listRequest();
    expect(req.request.params.get('make')).toBe('Toyota');
    expect(req.request.params.get('bodyType')).toBe('PICKUP');
    expect(req.request.params.get('sort')).toBe('price_asc');
    expect(req.request.params.get('pageSize')).toBe('12');
    req.flush(page([vehicle({ slug: 'a' }), vehicle({ slug: 'b', model: 'Fortuner', title: 'Toyota Fortuner' })]));
    await harness.fixture.whenStable();

    const el = harness.routeNativeElement!;
    expect(el.querySelectorAll('[data-testid="vehicle-card"]').length).toBe(2);
    expect(el.querySelector('[data-testid="results-count"]')!.textContent).toContain('2 vehicles');
    expect(el.querySelector('[data-testid="active-filters"]')!.textContent).toContain('Toyota');
  });

  it('writes filter changes to the URL and refetches', async () => {
    await harness.navigateByUrl('/inventory');
    flushFacets();
    listRequest().flush(page([vehicle({})]));
    await harness.fixture.whenStable();

    const el = harness.routeNativeElement!;
    el.querySelector<HTMLButtonElement>('[data-testid="filter-condition-BRAND_NEW"]')!.click();
    await harness.fixture.whenStable();
    expect(router.url).toBe('/inventory?condition=BRAND_NEW');

    const req = listRequest();
    expect(req.request.params.get('condition')).toBe('BRAND_NEW');
    req.flush(page([]));
    await harness.fixture.whenStable();
    expect(el.textContent).toContain('No vehicles found.');
    expect(el.textContent).toContain('Try changing your filters.');
  });

  it('shows an error state with retry', async () => {
    await harness.navigateByUrl('/inventory');
    flushFacets();
    listRequest().flush({ success: false, message: 'boom' }, { status: 500, statusText: 'Server Error' });
    await harness.fixture.whenStable();
    const el = harness.routeNativeElement!;
    expect(el.textContent).toContain('Something went wrong.');
    el.querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    await harness.fixture.whenStable();
    listRequest().flush(page([vehicle({})]));
    await harness.fixture.whenStable();
    expect(el.querySelectorAll('[data-testid="vehicle-card"]').length).toBe(1);
  });
});
