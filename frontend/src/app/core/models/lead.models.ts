import type { VehicleStatus } from './vehicle.models';

export const ENQUIRY_STATUSES = ['NEW', 'CONTACTED', 'CLOSED'] as const;
export const SELL_REQUEST_STATUSES = ['NEW', 'CONTACTED', 'EVALUATING', 'CLOSED'] as const;
export const SELL_INTENTS = ['SELL', 'EXCHANGE'] as const;
export const SELL_CONDITIONS = ['EXCELLENT', 'GOOD', 'FAIR', 'NEEDS_WORK'] as const;

export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];
export type SellRequestStatus = (typeof SELL_REQUEST_STATUSES)[number];
export type SellIntent = (typeof SELL_INTENTS)[number];
export type SellCondition = (typeof SELL_CONDITIONS)[number];
export type EnquirySource = 'VEHICLE_PAGE' | 'CONTACT_PAGE' | 'GENERAL';
export type Lang = 'en' | 'ur';

export interface EnquiryInput {
  name: string;
  phone: string;
  email?: string;
  message: string;
  vehicleId?: string;
  source?: EnquirySource;
  locale?: Lang;
  website?: string;
}

export interface EnquiryCreated {
  id: string;
  status: EnquiryStatus;
  createdAt: string;
  vehicleTitle: string | null;
}

export interface EnquiryVehicleSummary {
  id: string;
  slug: string;
  make: string;
  model: string;
  variant: string | null;
  year: number;
  status: VehicleStatus;
  images: { thumbUrl: string | null; url: string }[];
}

export interface Enquiry {
  id: string;
  vehicleId: string | null;
  vehicleTitle: string | null;
  vehicleSlug: string | null;
  name: string;
  phone: string;
  email: string | null;
  message: string;
  source: EnquirySource;
  status: EnquiryStatus;
  notes: string | null;
  locale: string | null;
  createdAt: string;
  updatedAt: string;
  vehicle: EnquiryVehicleSummary | null;
}

export interface SellRequestImage {
  id: string;
  url: string;
  thumbUrl: string | null;
  createdAt: string;
}

export interface SellRequest {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  mileage: number | null;
  condition: SellCondition | null;
  expectedPrice: number | null;
  intent: SellIntent;
  message: string | null;
  status: SellRequestStatus;
  notes: string | null;
  locale: string | null;
  createdAt: string;
  updatedAt: string;
  images: SellRequestImage[];
}

export interface SellRequestCreated {
  id: string;
  status: SellRequestStatus;
  intent: SellIntent;
  createdAt: string;
  imageCount: number;
}
