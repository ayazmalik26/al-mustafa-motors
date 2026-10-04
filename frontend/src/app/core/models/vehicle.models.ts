export const VEHICLE_CONDITIONS = ['USED', 'BRAND_NEW'] as const;
export const VEHICLE_STATUSES = ['AVAILABLE', 'RESERVED', 'SOLD'] as const;
export const BODY_TYPES = ['SEDAN', 'HATCHBACK', 'SUV', 'CROSSOVER', 'PICKUP', 'VAN', 'MPV', 'COUPE', 'WAGON', 'OTHER'] as const;
export const FUEL_TYPES = ['PETROL', 'DIESEL', 'HYBRID', 'PLUG_IN_HYBRID', 'ELECTRIC', 'CNG'] as const;
export const TRANSMISSIONS = ['AUTOMATIC', 'MANUAL'] as const;
export const VEHICLE_SORTS = ['newest', 'price_asc', 'price_desc', 'year_desc', 'mileage_asc'] as const;

export type VehicleCondition = (typeof VEHICLE_CONDITIONS)[number];
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];
export type BodyType = (typeof BODY_TYPES)[number];
export type FuelType = (typeof FUEL_TYPES)[number];
export type Transmission = (typeof TRANSMISSIONS)[number];
export type VehicleSort = (typeof VEHICLE_SORTS)[number];

export interface VehicleImage {
  id: string;
  url: string;
  thumbUrl: string | null;
  alt: string | null;
  width: number | null;
  height: number | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface Vehicle {
  id: string;
  slug: string;
  title: string;
  make: string;
  model: string;
  variant: string | null;
  year: number;
  condition: VehicleCondition;
  bodyType: BodyType;
  fuelType: FuelType;
  transmission: Transmission;
  mileage: number | null;
  engine: string | null;
  color: string | null;
  price: number | null;
  priceDisplay: string | null;
  status: VehicleStatus;
  description: string | null;
  featured: boolean;
  isDemo: boolean;
  soldAt: string | null;
  createdAt: string;
  updatedAt: string;
  images: VehicleImage[];
  primaryImage: VehicleImage | null;
  imageCount: number;
}

export interface FacetCount {
  value: string;
  count: number;
}

export interface VehicleFacets {
  makes: FacetCount[];
  models: { make: string; model: string; count: number }[];
  bodyTypes: FacetCount[];
  fuelTypes: FacetCount[];
  transmissions: FacetCount[];
  conditions: FacetCount[];
  statuses: FacetCount[];
  years: { min: number | null; max: number | null };
  price: { min: number | null; max: number | null };
  mileage: { max: number | null };
  total: number;
}

/** Inventory filters — mirrored 1:1 in the URL query string. */
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
  maxMileage?: number;
  sort?: VehicleSort;
  page?: number;
}

export type VehicleInput = Partial<
  Pick<
    Vehicle,
    | 'make'
    | 'model'
    | 'variant'
    | 'year'
    | 'condition'
    | 'bodyType'
    | 'fuelType'
    | 'transmission'
    | 'mileage'
    | 'engine'
    | 'color'
    | 'price'
    | 'priceDisplay'
    | 'status'
    | 'description'
    | 'featured'
    | 'isDemo'
    | 'slug'
  >
>;
