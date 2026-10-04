import type { Params } from '@angular/router';
import {
  BODY_TYPES,
  FUEL_TYPES,
  TRANSMISSIONS,
  VEHICLE_CONDITIONS,
  VEHICLE_SORTS,
  VEHICLE_STATUSES,
  type VehicleFilters,
} from '../models/vehicle.models';

export const INVENTORY_PAGE_SIZE = 12;

type ParamSource = { get(name: string): string | null } | Params;

const read = (source: ParamSource, key: string): string | undefined => {
  const raw = typeof (source as { get?: unknown }).get === 'function' ? (source as { get(n: string): string | null }).get(key) : (source as Params)[key];
  if (raw == null) return undefined;
  const value = String(Array.isArray(raw) ? raw[0] : raw).trim();
  return value === '' ? undefined : value;
};

const oneOf = <T extends string>(allowed: readonly T[], value: string | undefined): T | undefined =>
  value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;

const int = (value: string | undefined, min = 0, max = Number.MAX_SAFE_INTEGER): number | undefined => {
  if (value === undefined) return undefined;
  const n = Number(value.replace(/[,\s]/g, ''));
  return Number.isInteger(n) && n >= min && n <= max ? n : undefined;
};

/** Reads inventory filters from URL query params, ignoring anything invalid. */
export function filtersFromParams(source: ParamSource): VehicleFilters {
  const filters: VehicleFilters = {
    q: read(source, 'q')?.slice(0, 100),
    make: read(source, 'make')?.slice(0, 40),
    model: read(source, 'model')?.slice(0, 60),
    condition: oneOf(VEHICLE_CONDITIONS, read(source, 'condition')),
    bodyType: oneOf(BODY_TYPES, read(source, 'bodyType')),
    fuelType: oneOf(FUEL_TYPES, read(source, 'fuelType')),
    transmission: oneOf(TRANSMISSIONS, read(source, 'transmission')),
    status: oneOf(VEHICLE_STATUSES, read(source, 'status')),
    minYear: int(read(source, 'minYear'), 1950, 2100),
    maxYear: int(read(source, 'maxYear'), 1950, 2100),
    minPrice: int(read(source, 'minPrice')),
    maxPrice: int(read(source, 'maxPrice')),
    maxMileage: int(read(source, 'maxMileage')),
    sort: oneOf(VEHICLE_SORTS, read(source, 'sort')),
    page: int(read(source, 'page'), 1, 10_000),
  };
  return compact(filters);
}

/** Converts filters to query params for router navigation (defaults are omitted to keep URLs short). */
export function filtersToQueryParams(filters: VehicleFilters): Params {
  const params: Params = {};
  for (const [key, value] of Object.entries(compact(filters))) {
    if (key === 'sort' && value === 'newest') continue;
    if (key === 'page' && value === 1) continue;
    params[key] = String(value);
  }
  return params;
}

/** Parameters for GET /api/vehicles. */
export function filtersToApiParams(filters: VehicleFilters, pageSize = INVENTORY_PAGE_SIZE): Record<string, string> {
  const params: Record<string, string> = { pageSize: String(pageSize) };
  for (const [key, value] of Object.entries(compact(filters))) params[key] = String(value);
  return params;
}

/** Number of active filters (search, sort and page are not counted). */
export function countActiveFilters(filters: VehicleFilters): number {
  const { q: _q, sort: _sort, page: _page, ...rest } = compact(filters);
  return Object.keys(rest).length;
}

/** Returns a copy with one or more keys removed and the page reset. */
export function withoutFilters(filters: VehicleFilters, ...keys: (keyof VehicleFilters)[]): VehicleFilters {
  const next = { ...filters };
  for (const key of keys) delete next[key];
  delete next.page;
  return next;
}

export function compact<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== '')) as T;
}
