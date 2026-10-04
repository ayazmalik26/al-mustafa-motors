export interface BusinessSettings {
  businessName: string;
  phone: string;
  whatsapp: string;
  email: string | null;
  address: string;
  addressUr: string | null;
  googleMapsUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  openingHours: string | null;
  openingHoursUr: string | null;
  description: string | null;
  descriptionUr: string | null;
  heroTitle: string | null;
  heroTitleUr: string | null;
  heroSubtitle: string | null;
  heroSubtitleUr: string | null;
  heroImageUrl: string | null;
  showDemoNotice: boolean;
  updatedAt: string;
  /** Derived by the API. */
  siteUrl: string;
  mapEmbedUrl: string;
}

export type SettingsInput = Partial<Omit<BusinessSettings, 'siteUrl' | 'mapEmbedUrl' | 'updatedAt'>>;

export type Role = 'ADMIN' | 'STAFF';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface DashboardStats {
  vehicles: { total: number; available: number; reserved: number; sold: number; featured: number };
  enquiries: { total: number; new: number; contacted: number; closed: number };
  sellRequests: { total: number; new: number; open: number; evaluating: number };
  leadsByDay: { date: string; enquiries: number; sellRequests: number }[];
  inventoryByMake: { make: string; count: number }[];
  recentEnquiries: { id: string; name: string; phone: string; vehicleTitle: string | null; status: string; createdAt: string }[];
  recentSellRequests: {
    id: string;
    name: string;
    phone: string;
    vehicleMake: string;
    vehicleModel: string;
    vehicleYear: number;
    intent: string;
    status: string;
    createdAt: string;
  }[];
}
