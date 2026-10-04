/**
 * Database seed — DEVELOPMENT / DEMO DATA ONLY.
 *
 * Creates:
 *  - a development admin + staff account (credentials from .env, defaults documented in README)
 *  - the business settings row (from .env defaults) if it does not exist yet
 *  - 15 DEMO vehicles (flagged isDemo = true and labelled "Demo listing" on the website)
 *
 * The demo vehicles, prices, mileage, availability and photos are illustrative only.
 * They do NOT describe real stock at Al-Mustafa Motors. Photos are free Unsplash images.
 *
 * Safe to re-run: users and settings are only created when missing; demo vehicles are upserted by slug.
 */
import { config } from 'dotenv';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  BodyType,
  FuelType,
  Role,
  Transmission,
  VehicleCondition,
  VehicleStatus,
} from '../src/generated/prisma/client.js';

config({ path: ['.env', '../.env'], quiet: true });

if (process.env.NODE_ENV === 'production' && process.env.SEED_DEMO !== 'true') {
  console.error('Refusing to seed demo data with NODE_ENV=production. Set SEED_DEMO=true to override.');
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const unsplash = (id: string, w: number) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

interface DemoVehicle {
  slug: string;
  make: string;
  model: string;
  variant?: string;
  year: number;
  condition: VehicleCondition;
  bodyType: BodyType;
  fuelType: FuelType;
  transmission: Transmission;
  mileage: number | null;
  engine: string;
  color: string;
  price: number | null;
  status: VehicleStatus;
  featured: boolean;
  description: string;
  photos: string[];
  /** Days before "now" the listing was created — gives the "Newest" sort something to work with. */
  ageDays: number;
}

const DEMO_NOTE =
  'Demo listing: this vehicle, its price, mileage and availability are sample data used to demonstrate the website — not actual stock.';

const vehicles: DemoVehicle[] = [
  {
    slug: 'toyota-land-cruiser-2021',
    make: 'Toyota', model: 'Land Cruiser', variant: 'ZX', year: 2021,
    condition: 'USED', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC',
    mileage: 38000, engine: '4.6L V8', color: 'Black', price: null, status: 'AVAILABLE', featured: true,
    description: 'Full-size body-on-frame SUV with seating for seven, leather interior and full-time four-wheel drive.',
    photos: ['1650530579355-7ad9d4766043', '1624951352908-3579b7df9c05', '1661096478555-4d0ce10169b6'],
    ageDays: 2,
  },
  {
    slug: 'toyota-land-cruiser-2023',
    make: 'Toyota', model: 'Land Cruiser', variant: '300 ZX', year: 2023,
    condition: 'USED', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC',
    mileage: 21000, engine: '3.5L V6 twin-turbo', color: 'White Pearl', price: null, status: 'RESERVED', featured: true,
    description: 'The 300-series Land Cruiser with a twin-turbo V6, ten-speed automatic and a modern cabin.',
    photos: ['1654688554491-69d21d38fb91'],
    ageDays: 5,
  },
  {
    slug: 'toyota-fortuner-2024',
    make: 'Toyota', model: 'Fortuner', variant: 'Legender', year: 2024,
    condition: 'USED', bodyType: 'SUV', fuelType: 'DIESEL', transmission: 'AUTOMATIC',
    mileage: 18000, engine: '2.8L Diesel', color: 'White', price: 17500000, status: 'AVAILABLE', featured: true,
    description: 'Seven-seat diesel SUV in Legender trim with LED lighting and a two-tone exterior.',
    photos: ['1664783856972-ac9922d7b2d3'],
    ageDays: 1,
  },
  {
    slug: 'toyota-hilux-2023',
    make: 'Toyota', model: 'Hilux', variant: 'Revo V', year: 2023,
    condition: 'USED', bodyType: 'PICKUP', fuelType: 'DIESEL', transmission: 'AUTOMATIC',
    mileage: 31500, engine: '2.8L Diesel', color: 'Silver', price: 13200000, status: 'AVAILABLE', featured: true,
    description: 'Double-cab pickup with the 2.8L diesel engine, automatic gearbox and four-wheel drive.',
    photos: ['1631377875413-b1e3e660bfa2', '1654168441839-410635603c3d'],
    ageDays: 8,
  },
  {
    slug: 'toyota-hilux-2024',
    make: 'Toyota', model: 'Hilux', variant: 'GR-S', year: 2024,
    condition: 'USED', bodyType: 'PICKUP', fuelType: 'DIESEL', transmission: 'AUTOMATIC',
    mileage: 12000, engine: '2.8L Diesel', color: 'Black', price: 16900000, status: 'AVAILABLE', featured: false,
    description: 'GR-Sport styled Hilux with sport-tuned suspension, black alloys and a dedicated grille.',
    photos: ['1758393605683-e28bb39d8917'],
    ageDays: 12,
  },
  {
    slug: 'toyota-corolla-altis-2026',
    make: 'Toyota', model: 'Corolla Altis', variant: 'Grande 1.8 CVT', year: 2026,
    condition: 'BRAND_NEW', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'AUTOMATIC',
    mileage: 0, engine: '1.8L Petrol', color: 'Super White', price: null, status: 'AVAILABLE', featured: true,
    description: 'Brand-new Corolla Altis Grande. Ask us for current pricing and delivery timelines.',
    photos: ['1623869675781-80aa31012a5a'],
    ageDays: 3,
  },
  {
    slug: 'toyota-hilux-2020',
    make: 'Toyota', model: 'Hilux', variant: 'Revo G', year: 2020,
    condition: 'USED', bodyType: 'PICKUP', fuelType: 'DIESEL', transmission: 'MANUAL',
    mileage: 68000, engine: '2.8L Diesel', color: 'White', price: 9800000, status: 'SOLD', featured: false,
    description: 'Manual double-cab Hilux, a dependable workhorse for city and highway use.',
    photos: ['1714213624189-9a9fc8a0736a'],
    ageDays: 40,
  },
  {
    slug: 'honda-civic-2021',
    make: 'Honda', model: 'Civic', variant: 'Oriel 1.8 i-VTEC', year: 2021,
    condition: 'USED', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'AUTOMATIC',
    mileage: 47000, engine: '1.8L i-VTEC', color: 'Rallye Red', price: 7450000, status: 'AVAILABLE', featured: true,
    description: 'Tenth-generation Civic Oriel with CVT automatic, sunroof and push-button start.',
    photos: ['1605816988069-b11383b50717'],
    ageDays: 6,
  },
  {
    slug: 'honda-civic-2020',
    make: 'Honda', model: 'Civic', variant: '1.5 RS Turbo', year: 2020,
    condition: 'USED', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'AUTOMATIC',
    mileage: 55000, engine: '1.5L VTEC Turbo', color: 'Crystal Black', price: 6900000, status: 'AVAILABLE', featured: false,
    description: 'Turbocharged Civic RS with sport styling, paddle shifters and Honda Sensing features.',
    photos: ['1594070319944-7c0cbebb6f58'],
    ageDays: 15,
  },
  {
    slug: 'suzuki-swift-2024',
    make: 'Suzuki', model: 'Swift', variant: 'GLX CVT', year: 2024,
    condition: 'USED', bodyType: 'HATCHBACK', fuelType: 'PETROL', transmission: 'AUTOMATIC',
    mileage: 9500, engine: '1.2L Petrol', color: 'Pearl White', price: 4350000, status: 'AVAILABLE', featured: true,
    description: 'Economical city hatchback with CVT automatic, touchscreen infotainment and reverse camera.',
    photos: ['1663852408695-f57f4d75a536'],
    ageDays: 4,
  },
  {
    slug: 'suzuki-alto-2019',
    make: 'Suzuki', model: 'Alto', variant: 'VXR', year: 2019,
    condition: 'USED', bodyType: 'HATCHBACK', fuelType: 'PETROL', transmission: 'MANUAL',
    mileage: 61000, engine: '660cc Petrol', color: 'Champagne', price: 1950000, status: 'RESERVED', featured: false,
    description: 'Compact, fuel-efficient first car for city driving.',
    photos: ['1762332968954-a74836324d61'],
    ageDays: 20,
  },
  {
    slug: 'hyundai-tucson-2022',
    make: 'Hyundai', model: 'Tucson', variant: 'FWD A/T GLS Sport', year: 2022,
    condition: 'USED', bodyType: 'CROSSOVER', fuelType: 'PETROL', transmission: 'AUTOMATIC',
    mileage: 29000, engine: '2.0L Petrol', color: 'Polar White', price: 8600000, status: 'AVAILABLE', featured: true,
    description: 'Comfortable family crossover with panoramic roof, leather seats and smart key.',
    photos: ['1630051191354-932e27e318fe'],
    ageDays: 9,
  },
  {
    slug: 'hyundai-elantra-2022',
    make: 'Hyundai', model: 'Elantra', variant: '2.0 GLS', year: 2022,
    condition: 'USED', bodyType: 'SEDAN', fuelType: 'PETROL', transmission: 'AUTOMATIC',
    mileage: 34000, engine: '2.0L Petrol', color: 'Teal Green', price: 6750000, status: 'SOLD', featured: false,
    description: 'Seventh-generation Elantra with sharp styling, digital cluster and wireless charging.',
    photos: ['1728031401344-40811b71840c', '1716384277908-0024e397c30c'],
    ageDays: 30,
  },
  {
    slug: 'kia-sportage-2024',
    make: 'Kia', model: 'Sportage', variant: 'AWD', year: 2024,
    condition: 'USED', bodyType: 'SUV', fuelType: 'PETROL', transmission: 'AUTOMATIC',
    mileage: 6000, engine: '2.0L Petrol', color: 'Gravity Grey', price: null, status: 'AVAILABLE', featured: true,
    description: 'Latest-generation Sportage with all-wheel drive, curved display and premium interior.',
    photos: ['1688893288248-3338b8491a46', '1688893287874-ac7fbd686c24', '1688893288225-998da0f86859', '1649921777129-a28a26031a03'],
    ageDays: 0,
  },
  {
    slug: 'kia-picanto-2023',
    make: 'Kia', model: 'Picanto', variant: '1.0 AT', year: 2023,
    condition: 'USED', bodyType: 'HATCHBACK', fuelType: 'PETROL', transmission: 'AUTOMATIC',
    mileage: 15000, engine: '1.0L Petrol', color: 'Sunlight Yellow', price: 3550000, status: 'AVAILABLE', featured: false,
    description: 'Easy-to-park automatic city car with a lively colour and low running costs.',
    photos: ['1628066962109-a0b97f4d4810', '1628066985203-d45e75825a90', '1628067113805-af44de0c46b7'],
    ageDays: 11,
  },
];

async function seedUsers() {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@almustafamotors.local').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
  const accounts = [
    { email: adminEmail, name: 'Showroom Admin', role: Role.ADMIN },
    { email: 'staff@almustafamotors.local', name: 'Showroom Staff', role: Role.STAFF },
  ];
  for (const account of accounts) {
    const existing = await prisma.user.findUnique({ where: { email: account.email } });
    if (existing) continue;
    await prisma.user.create({
      data: { ...account, passwordHash: await bcrypt.hash(password, 12) },
    });
    console.log(`  + ${account.role.toLowerCase()} account ${account.email}`);
  }
}

async function seedSettings() {
  const existing = await prisma.setting.findUnique({ where: { id: 1 } });
  if (existing) return;
  await prisma.setting.create({
    data: {
      id: 1,
      businessName: process.env.BUSINESS_NAME || 'Al-Mustafa Motors',
      phone: process.env.BUSINESS_PHONE || '+923118382992',
      whatsapp: process.env.WHATSAPP_NUMBER || '+923368440890',
      email: null,
      address: 'Plot 163, Shop 2, Main University Road, near Telephone Exchange, Old Sabzi Mandi, Karachi',
      addressUr: 'پلاٹ 163، دکان 2، مین یونیورسٹی روڈ، ٹیلی فون ایکسچینج کے قریب، اولڈ سبزی منڈی، کراچی',
      googleMapsUrl:
        process.env.GOOGLE_MAPS_URL ||
        'https://www.google.com/maps/search/?api=1&query=Al-Mustafa+Motors+Main+University+Road+Karachi',
      latitude: null,
      longitude: null,
      facebookUrl: 'https://www.facebook.com/AlMustafaMotors/',
      instagramUrl: null,
      openingHours: 'Daily 11:00 – 20:00 (please confirm before visiting)',
      openingHoursUr: 'روزانہ 11:00 تا 20:00 (آنے سے پہلے تصدیق کر لیں)',
      description:
        'Al-Mustafa Motors is a car showroom on Main University Road, Karachi, dealing in the sale, purchase and exchange of used and brand-new vehicles.',
      descriptionUr:
        'المصطفیٰ موٹرز مین یونیورسٹی روڈ، کراچی پر واقع کار شوروم ہے جہاں نئی اور استعمال شدہ گاڑیوں کی خرید، فروخت اور تبادلہ کیا جاتا ہے۔',
      heroImageUrl: unsplash('1650530579355-7ad9d4766043', 2000),
      showDemoNotice: true,
    },
  });
  console.log('  + settings (concept contact details — verify with the business owner before launch)');
}

async function seedVehicles() {
  const now = Date.now();
  for (const v of vehicles) {
    const { photos, ageDays, ...fields } = v;
    const title = [v.make, v.model, v.variant].filter(Boolean).join(' ');
    const createdAt = new Date(now - ageDays * 86_400_000);
    const data = {
      ...fields,
      description: `${v.description}\n\n${DEMO_NOTE}`,
      isDemo: true,
      soldAt: v.status === 'SOLD' ? createdAt : null,
    };
    const vehicle = await prisma.vehicle.upsert({
      where: { slug: v.slug },
      create: { ...data, createdAt },
      update: data,
    });
    await prisma.vehicleImage.deleteMany({ where: { vehicleId: vehicle.id } });
    await prisma.vehicleImage.createMany({
      data: photos.map((id, i) => ({
        vehicleId: vehicle.id,
        url: unsplash(id, 1600),
        thumbUrl: unsplash(id, 640),
        alt: `${title} ${v.year} — demo photo ${i + 1}`,
        sortOrder: i,
        isPrimary: i === 0,
      })),
    });
  }
  console.log(`  + ${vehicles.length} demo vehicles`);
}

async function main() {
  console.log('Seeding database (development/demo data)…');
  await seedUsers();
  await seedSettings();
  await seedVehicles();
  console.log('Done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
