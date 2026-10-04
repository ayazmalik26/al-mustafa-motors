import type { Prisma } from '../../generated/prisma/client.js';
import type { BodyType, FuelType, Transmission, VehicleCondition, VehicleStatus } from '../../generated/prisma/enums.js';

export const VEHICLE_SORTS = ['newest', 'price_asc', 'price_desc', 'year_desc', 'mileage_asc'] as const;
export type VehicleSort = (typeof VEHICLE_SORTS)[number];

export interface VehicleFilters {
  q?: string;
  make?: string;
  model?: string;
  condition?: VehicleCondition;
  bodyType?: BodyType;
  fuelType?: FuelType;
  transmission?: Transmission;
  status?: VehicleStatus;
  minYear?: number;
  maxYear?: number;
  minPrice?: number;
  maxPrice?: number;
  minMileage?: number;
  maxMileage?: number;
  featured?: boolean;
  ids?: string[];
  excludeId?: string;
}

const insensitive = (value: string) => ({ equals: value, mode: 'insensitive' as const });
const contains = (value: string) => ({ contains: value, mode: 'insensitive' as const });

/** Turns free-text search into AND-ed terms, each matching make, model, variant or year. */
export function buildSearchClause(q: string | undefined): Prisma.VehicleWhereInput[] {
  if (!q) return [];
  const terms = q
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 6);
  return terms.map((term) => {
    const or: Prisma.VehicleWhereInput[] = [{ make: contains(term) }, { model: contains(term) }, { variant: contains(term) }];
    if (/^(19|20)\d{2}$/.test(term)) or.push({ year: Number(term) });
    return { OR: or };
  });
}

/** Builds the Prisma `where` clause for the inventory filters. Pure function — unit tested. */
export function buildVehicleWhere(f: VehicleFilters): Prisma.VehicleWhereInput {
  const and: Prisma.VehicleWhereInput[] = [...buildSearchClause(f.q)];

  if (f.make) and.push({ make: insensitive(f.make) });
  if (f.model) and.push({ model: insensitive(f.model) });
  if (f.condition) and.push({ condition: f.condition });
  if (f.bodyType) and.push({ bodyType: f.bodyType });
  if (f.fuelType) and.push({ fuelType: f.fuelType });
  if (f.transmission) and.push({ transmission: f.transmission });
  if (f.status) and.push({ status: f.status });
  if (f.featured !== undefined) and.push({ featured: f.featured });

  if (f.minYear !== undefined || f.maxYear !== undefined) {
    and.push({ year: { ...(f.minYear !== undefined && { gte: f.minYear }), ...(f.maxYear !== undefined && { lte: f.maxYear }) } });
  }
  // Vehicles without a price ("Price on request") cannot satisfy a price range, so they are excluded.
  if (f.minPrice !== undefined || f.maxPrice !== undefined) {
    and.push({ price: { not: null, ...(f.minPrice !== undefined && { gte: f.minPrice }), ...(f.maxPrice !== undefined && { lte: f.maxPrice }) } });
  }
  if (f.minMileage !== undefined || f.maxMileage !== undefined) {
    and.push({
      mileage: { not: null, ...(f.minMileage !== undefined && { gte: f.minMileage }), ...(f.maxMileage !== undefined && { lte: f.maxMileage }) },
    });
  }

  if (f.ids?.length) and.push({ id: { in: f.ids } });
  if (f.excludeId) and.push({ id: { not: f.excludeId } });

  return and.length ? { AND: and } : {};
}

/** Sort order; vehicles with unknown price/mileage always go last. A stable tiebreaker keeps pagination consistent. */
export function buildVehicleOrderBy(sort: VehicleSort = 'newest'): Prisma.VehicleOrderByWithRelationInput[] {
  const tiebreak: Prisma.VehicleOrderByWithRelationInput[] = [{ createdAt: 'desc' }, { id: 'asc' }];
  switch (sort) {
    case 'price_asc':
      return [{ price: { sort: 'asc', nulls: 'last' } }, ...tiebreak];
    case 'price_desc':
      return [{ price: { sort: 'desc', nulls: 'last' } }, ...tiebreak];
    case 'year_desc':
      return [{ year: 'desc' }, ...tiebreak];
    case 'mileage_asc':
      return [{ mileage: { sort: 'asc', nulls: 'last' } }, ...tiebreak];
    case 'newest':
    default:
      return tiebreak;
  }
}
