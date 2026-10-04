import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import sharp from 'sharp';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

export const PASSWORD = 'Test-Password-1';
export const ADMIN_EMAIL = 'admin@test.local';
export const STAFF_EMAIL = 'staff@test.local';

export async function createTestApp() {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false, logger: ['error'] });
  configureApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService), http: () => request(app.getHttpServer()) };
}

/** Wipes the test database and inserts a small, known data set. */
export async function resetDatabase(prisma: PrismaService) {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "enquiries", "sell_request_images", "sell_requests", "vehicle_images", "vehicles", "users", "settings" RESTART IDENTITY CASCADE',
  );
  const passwordHash = await bcrypt.hash(PASSWORD, 4);
  await prisma.user.createMany({
    data: [
      { email: ADMIN_EMAIL, name: 'Test Admin', role: 'ADMIN', passwordHash },
      { email: STAFF_EMAIL, name: 'Test Staff', role: 'STAFF', passwordHash },
    ],
  });
  await prisma.setting.create({
    data: {
      id: 1,
      businessName: 'Test Motors',
      phone: '+923001112222',
      whatsapp: '+923003334444',
      address: 'Test Road, Karachi',
    },
  });

  const day = 86_400_000;
  const vehicles = [
    { slug: 'toyota-fortuner-2024', make: 'Toyota', model: 'Fortuner', year: 2024, bodyType: 'SUV', fuelType: 'DIESEL', price: 17_500_000, mileage: 18_000, featured: true, status: 'AVAILABLE', age: 1 },
    { slug: 'toyota-hilux-2023', make: 'Toyota', model: 'Hilux', year: 2023, bodyType: 'PICKUP', fuelType: 'DIESEL', price: 13_200_000, mileage: 31_500, featured: true, status: 'RESERVED', age: 2 },
    { slug: 'toyota-land-cruiser-2021', make: 'Toyota', model: 'Land Cruiser', year: 2021, bodyType: 'SUV', fuelType: 'PETROL', price: null, mileage: 38_000, featured: false, status: 'AVAILABLE', age: 3 },
    { slug: 'honda-civic-2021', make: 'Honda', model: 'Civic', year: 2021, bodyType: 'SEDAN', fuelType: 'PETROL', price: 7_450_000, mileage: 47_000, featured: true, status: 'AVAILABLE', age: 4 },
    { slug: 'suzuki-swift-2024', make: 'Suzuki', model: 'Swift', year: 2024, bodyType: 'HATCHBACK', fuelType: 'PETROL', price: 4_350_000, mileage: 9_500, featured: false, status: 'SOLD', age: 5 },
  ] as const;

  for (const { age, ...v } of vehicles) {
    await prisma.vehicle.create({
      data: {
        ...v,
        condition: 'USED',
        transmission: 'AUTOMATIC',
        createdAt: new Date(Date.now() - age * day),
        images: { create: [{ url: `https://example.com/${v.slug}.jpg`, thumbUrl: `https://example.com/${v.slug}-sm.jpg`, isPrimary: true, sortOrder: 0 }] },
      },
    });
  }
}

/** Logs in and returns the session cookie header. */
export async function login(http: () => ReturnType<typeof request>, email: string): Promise<string[]> {
  const res = await http().post('/api/auth/login').send({ email, password: PASSWORD }).expect(200);
  const cookies = res.get('Set-Cookie');
  if (!cookies?.length) throw new Error('No session cookie returned');
  return cookies;
}

export function testJpeg(width = 800, height = 600) {
  return sharp({ create: { width, height, channels: 3, background: '#2d4a3e' } }).jpeg().toBuffer();
}
