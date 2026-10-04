import type { INestApplication } from '@nestjs/common';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { STAFF_EMAIL, createTestApp, login, resetDatabase, testJpeg } from './helpers.js';

describe('Enquiries & sell requests API', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: Awaited<ReturnType<typeof createTestApp>>['http'];
  let staff: string[];
  let vehicleId: string;

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    http = ctx.http;
    prisma = ctx.prisma;
    await resetDatabase(prisma);
    staff = await login(http, STAFF_EMAIL);
    vehicleId = (await prisma.vehicle.findUniqueOrThrow({ where: { slug: 'toyota-fortuner-2024' } })).id;
  });

  afterAll(() => app.close());

  describe('POST /api/enquiries', () => {
    it('saves a vehicle enquiry and snapshots the vehicle name from the database', async () => {
      const res = await http()
        .post('/api/enquiries')
        .send({
          name: 'Ahmed Khan',
          phone: '0300 1234567',
          email: 'ahmed@example.com',
          message: 'Is this Fortuner still available for viewing?',
          vehicleId,
          locale: 'en',
        })
        .expect(201);

      expect(res.body.data).toMatchObject({ status: 'NEW', vehicleTitle: 'Toyota Fortuner 2024' });
      const saved = await prisma.enquiry.findUniqueOrThrow({ where: { id: res.body.data.id } });
      expect(saved).toMatchObject({ phone: '+923001234567', source: 'VEHICLE_PAGE', vehicleSlug: 'toyota-fortuner-2024' });
    });

    it('accepts a general enquiry without email', async () => {
      const res = await http()
        .post('/api/enquiries')
        .send({ name: 'Sara', phone: '+92 321 0000000', message: 'What are your opening hours on Friday?', source: 'CONTACT_PAGE' })
        .expect(201);
      expect(res.body.data.vehicleTitle).toBeNull();
    });

    it('returns field errors for invalid input', async () => {
      const res = await http().post('/api/enquiries').send({ name: '', phone: 'abc', email: 'nope', message: 'hi' }).expect(400);
      expect(Object.keys(res.body.errors).sort()).toEqual(['email', 'message', 'name', 'phone']);
    });

    it('rejects enquiries for vehicles that do not exist', async () => {
      await http()
        .post('/api/enquiries')
        .send({ name: 'Ali', phone: '03001234567', message: 'Interested in this car please', vehicleId: '00000000-0000-4000-8000-000000000000' })
        .expect(400);
    });

    it('rejects bot submissions (honeypot)', async () => {
      await http()
        .post('/api/enquiries')
        .send({ name: 'Bot', phone: '03001234567', message: 'Buy cheap followers now!!!', website: 'http://spam.example' })
        .expect(400);
    });
  });

  describe('GET/PATCH /api/enquiries', () => {
    it('requires authentication', async () => {
      await http().get('/api/enquiries').expect(401);
    });

    it('lists enquiries newest first with vehicle summary', async () => {
      const res = await http().get('/api/enquiries').set('Cookie', staff).expect(200);
      expect(res.body.meta.total).toBe(2);
      const withVehicle = res.body.data.find((e: { vehicleId: string | null }) => e.vehicleId);
      expect(withVehicle.vehicle).toMatchObject({ slug: 'toyota-fortuner-2024' });
    });

    it('filters by status and search text', async () => {
      const res = await http().get('/api/enquiries?status=NEW&q=ahmed').set('Cookie', staff).expect(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Ahmed Khan');
    });

    it('updates status and internal notes', async () => {
      const list = await http().get('/api/enquiries?q=ahmed').set('Cookie', staff);
      const id = list.body.data[0].id;
      const res = await http().patch(`/api/enquiries/${id}`).set('Cookie', staff).send({ status: 'CONTACTED', notes: 'Called, visiting Saturday' }).expect(200);
      expect(res.body.data).toMatchObject({ status: 'CONTACTED', notes: 'Called, visiting Saturday' });
      await http().patch(`/api/enquiries/${id}`).set('Cookie', staff).send({ status: 'ARCHIVED' }).expect(400);
    });
  });

  describe('POST /api/sell-requests', () => {
    it('saves a sell/exchange request with photos (multipart)', async () => {
      const res = await http()
        .post('/api/sell-requests')
        .field('name', 'Bilal Ahmed')
        .field('phone', '0333 7654321')
        .field('vehicleMake', 'Honda')
        .field('vehicleModel', 'City')
        .field('vehicleYear', '2019')
        .field('mileage', '82,000')
        .field('condition', 'GOOD')
        .field('expectedPrice', '3500000')
        .field('intent', 'EXCHANGE')
        .field('message', 'Interested in exchanging for an SUV')
        .attach('images', await testJpeg(), { filename: 'city.jpg', contentType: 'image/jpeg' })
        .expect(201);

      expect(res.body.data).toMatchObject({ status: 'NEW', intent: 'EXCHANGE', imageCount: 1 });
      const saved = await prisma.sellRequest.findUniqueOrThrow({ where: { id: res.body.data.id }, include: { images: true } });
      expect(saved).toMatchObject({ vehicleYear: 2019, mileage: 82000, expectedPrice: 3_500_000, phone: '+923337654321' });
      expect(saved.images).toHaveLength(1);
    });

    it('accepts JSON without photos', async () => {
      await http()
        .post('/api/sell-requests')
        .send({ name: 'Usman', phone: '03001234567', vehicleMake: 'Suzuki', vehicleModel: 'Alto', vehicleYear: 2020, intent: 'SELL' })
        .expect(201);
    });

    it('validates required fields', async () => {
      const res = await http().post('/api/sell-requests').send({ name: 'X Y', phone: '03001234567', vehicleYear: 3000 }).expect(400);
      expect(Object.keys(res.body.errors).sort()).toEqual(['intent', 'vehicleMake', 'vehicleModel', 'vehicleYear']);
    });

    it('rolls back when a photo is invalid', async () => {
      const before = await prisma.sellRequest.count();
      await http()
        .post('/api/sell-requests')
        .field('name', 'Bad Upload')
        .field('phone', '03001234567')
        .field('vehicleMake', 'Kia')
        .field('vehicleModel', 'Picanto')
        .field('vehicleYear', '2022')
        .field('intent', 'SELL')
        .attach('images', Buffer.from('fake'), { filename: 'x.jpg', contentType: 'image/jpeg' })
        .expect(400);
      expect(await prisma.sellRequest.count()).toBe(before);
    });
  });

  describe('GET/PATCH /api/sell-requests', () => {
    it('requires authentication', async () => {
      await http().get('/api/sell-requests').expect(401);
    });

    it('lists sell requests with photos and filters by intent', async () => {
      const all = await http().get('/api/sell-requests').set('Cookie', staff).expect(200);
      expect(all.body.meta.total).toBe(2);
      const exchange = await http().get('/api/sell-requests?intent=EXCHANGE').set('Cookie', staff).expect(200);
      expect(exchange.body.data).toHaveLength(1);
      expect(exchange.body.data[0].images[0].url).toMatch(/^\/uploads\/sell-requests\//);
      expect(exchange.body.data[0].images[0]).not.toHaveProperty('storageKeys');
    });

    it('moves a request through the workflow', async () => {
      const list = await http().get('/api/sell-requests?intent=EXCHANGE').set('Cookie', staff);
      const id = list.body.data[0].id;
      for (const status of ['CONTACTED', 'EVALUATING', 'CLOSED']) {
        const res = await http().patch(`/api/sell-requests/${id}`).set('Cookie', staff).send({ status }).expect(200);
        expect(res.body.data.status).toBe(status);
      }
    });
  });
});
