import { buildSearchClause, buildVehicleOrderBy, buildVehicleWhere } from './vehicle-query.js';

describe('vehicle filtering', () => {
  it('returns an empty where clause when no filters are given', () => {
    expect(buildVehicleWhere({})).toEqual({});
  });

  it('matches make and model case-insensitively', () => {
    const where = buildVehicleWhere({ make: 'toyota', model: 'Hilux' });
    expect(where.AND).toEqual([
      { make: { equals: 'toyota', mode: 'insensitive' } },
      { model: { equals: 'Hilux', mode: 'insensitive' } },
    ]);
  });

  it('combines enum filters', () => {
    const where = buildVehicleWhere({
      condition: 'USED',
      bodyType: 'SUV',
      fuelType: 'DIESEL',
      transmission: 'AUTOMATIC',
      status: 'AVAILABLE',
      featured: true,
    });
    expect(where.AND).toEqual(
      expect.arrayContaining([
        { condition: 'USED' },
        { bodyType: 'SUV' },
        { fuelType: 'DIESEL' },
        { transmission: 'AUTOMATIC' },
        { status: 'AVAILABLE' },
        { featured: true },
      ]),
    );
  });

  it('builds inclusive year, price and mileage ranges', () => {
    const where = buildVehicleWhere({ minYear: 2020, maxYear: 2024, minPrice: 1_000_000, maxPrice: 5_000_000, maxMileage: 50_000 });
    expect(where.AND).toEqual(
      expect.arrayContaining([
        { year: { gte: 2020, lte: 2024 } },
        { price: { not: null, gte: 1_000_000, lte: 5_000_000 } },
        { mileage: { not: null, lte: 50_000 } },
      ]),
    );
  });

  it('excludes "price on request" vehicles only when a price range is used', () => {
    expect(JSON.stringify(buildVehicleWhere({ make: 'Kia' }))).not.toContain('price');
    expect(buildVehicleWhere({ maxPrice: 10 }).AND).toEqual([{ price: { not: null, lte: 10 } }]);
  });

  it('splits free-text search into AND-ed terms across make, model and variant', () => {
    const clause = buildSearchClause('fortuner legender');
    expect(clause).toHaveLength(2);
    expect(clause[0].OR).toEqual([
      { make: { contains: 'fortuner', mode: 'insensitive' } },
      { model: { contains: 'fortuner', mode: 'insensitive' } },
      { variant: { contains: 'fortuner', mode: 'insensitive' } },
    ]);
  });

  it('treats a four-digit search term as a possible model year', () => {
    const [term] = buildSearchClause('2024');
    expect(term.OR).toContainEqual({ year: 2024 });
  });

  it('ignores blank search input', () => {
    expect(buildSearchClause('   ')).toEqual([]);
    expect(buildSearchClause(undefined)).toEqual([]);
  });

  it('supports id lists and exclusions (saved vehicles / similar vehicles)', () => {
    const where = buildVehicleWhere({ ids: ['a', 'b'], excludeId: 'c' });
    expect(where.AND).toEqual([{ id: { in: ['a', 'b'] } }, { id: { not: 'c' } }]);
  });
});

describe('vehicle sorting', () => {
  it('defaults to newest first with a stable tiebreaker', () => {
    expect(buildVehicleOrderBy()).toEqual([{ createdAt: 'desc' }, { id: 'asc' }]);
  });

  it('puts unknown prices last in both price directions', () => {
    expect(buildVehicleOrderBy('price_asc')[0]).toEqual({ price: { sort: 'asc', nulls: 'last' } });
    expect(buildVehicleOrderBy('price_desc')[0]).toEqual({ price: { sort: 'desc', nulls: 'last' } });
  });

  it('sorts by year and mileage', () => {
    expect(buildVehicleOrderBy('year_desc')[0]).toEqual({ year: 'desc' });
    expect(buildVehicleOrderBy('mileage_asc')[0]).toEqual({ mileage: { sort: 'asc', nulls: 'last' } });
  });
});
