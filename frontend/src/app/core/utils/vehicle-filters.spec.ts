import { convertToParamMap } from '@angular/router';
import { countActiveFilters, filtersFromParams, filtersToApiParams, filtersToQueryParams, withoutFilters } from './vehicle-filters';

describe('vehicle filters ⇄ URL', () => {
  it('reads valid filters from query params', () => {
    const f = filtersFromParams(
      convertToParamMap({ make: 'Toyota', bodyType: 'SUV', condition: 'USED', minPrice: '1,000,000', maxYear: '2024', sort: 'price_asc', page: '2' }),
    );
    expect(f).toEqual({ make: 'Toyota', bodyType: 'SUV', condition: 'USED', minPrice: 1_000_000, maxYear: 2024, sort: 'price_asc', page: 2 });
  });

  it('ignores invalid enum values and numbers', () => {
    const f = filtersFromParams(convertToParamMap({ condition: 'OLD', bodyType: 'TANK', minYear: '1800', page: '-1', maxPrice: 'cheap', sort: 'random' }));
    expect(f).toEqual({});
  });

  it('trims and drops empty values', () => {
    expect(filtersFromParams(convertToParamMap({ q: '  civic  ', make: '' }))).toEqual({ q: 'civic' });
  });

  it('accepts plain objects (e.g. form values)', () => {
    expect(filtersFromParams({ make: 'Honda', minYear: '2020', model: '' })).toEqual({ make: 'Honda', minYear: 2020 });
  });

  it('writes query params, omitting defaults', () => {
    expect(filtersToQueryParams({ make: 'Toyota', sort: 'newest', page: 1, condition: 'USED' })).toEqual({ make: 'Toyota', condition: 'USED' });
    expect(filtersToQueryParams({ sort: 'year_desc', page: 3 })).toEqual({ sort: 'year_desc', page: '3' });
  });

  it('round-trips through the URL', () => {
    const original = { make: 'Kia', fuelType: 'PETROL' as const, maxMileage: 50000, sort: 'mileage_asc' as const, page: 2 };
    expect(filtersFromParams(convertToParamMap(filtersToQueryParams(original)))).toEqual(original);
  });

  it('builds API params with a page size', () => {
    expect(filtersToApiParams({ make: 'Suzuki', page: 2 }, 12)).toEqual({ pageSize: '12', make: 'Suzuki', page: '2' });
  });

  it('counts active filters, excluding search, sort and page', () => {
    expect(countActiveFilters({ q: 'x', sort: 'price_asc', page: 2 })).toBe(0);
    expect(countActiveFilters({ make: 'Toyota', minPrice: 1, maxPrice: 2, status: 'SOLD' })).toBe(4);
  });

  it('removes filters and resets the page', () => {
    expect(withoutFilters({ make: 'Toyota', model: 'Hilux', page: 3, sort: 'price_asc' }, 'make', 'model')).toEqual({ sort: 'price_asc' });
  });
});
