import type { INestApplication } from '@nestjs/common';
import { ADMIN_EMAIL, STAFF_EMAIL, createTestApp, login, resetDatabase, testJpeg } from './helpers.js';

describe('Vehicles API', () => {
  let app: INestApplication;
  let http: Awaited<ReturnType<typeof createTestApp>>['http'];
  let admin: string[];
  let staff: string[];

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    http = ctx.http;
    await resetDatabase(ctx.prisma);
    admin = await login(http, ADMIN_EMAIL);
    staff = await login(http, STAFF_EMAIL);
  });

  afterAll(() => app.close());

  describe('GET /api/vehicles', () => {
    it('returns a paginated envelope', async () => {
      const res = await http().get('/api/vehicles?pageSize=2').expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta).toEqual({ page: 1, pageSize: 2, total: 5, totalPages: 3 });
      expect(res.body.data[0]).toMatchObject({ slug: 'toyota-fortuner-2024', title: 'Toyota Fortuner', primaryImage: expect.any(Object) });
    });

    it('filters by make (case-insensitive) and body type', async () => {
      const res = await http().get('/api/vehicles?make=toyota&bodyType=SUV').expect(200);
      expect(res.body.data.map((v: { slug: string }) => v.slug).sort()).toEqual(['toyota-fortuner-2024', 'toyota-land-cruiser-2021']);
    });

    it('filters by status, year and price range', async () => {
      const sold = await http().get('/api/vehicles?status=SOLD').expect(200);
      expect(sold.body.data.map((v: { slug: string }) => v.slug)).toEqual(['suzuki-swift-2024']);

      const range = await http().get('/api/vehicles?minPrice=5000000&maxPrice=15000000&minYear=2021').expect(200);
      expect(range.body.data.map((v: { slug: string }) => v.slug).sort()).toEqual(['honda-civic-2021', 'toyota-hilux-2023']);
    });

    it('searches make, model and year', async () => {
      const res = await http().get('/api/vehicles?q=fortuner%202024').expect(200);
      expect(res.body.meta.total).toBe(1);
      expect(res.body.data[0].slug).toBe('toyota-fortuner-2024');
    });

    it('sorts by price with "price on request" last', async () => {
      const asc = await http().get('/api/vehicles?sort=price_asc').expect(200);
      expect(asc.body.data.map((v: { price: number | null }) => v.price)).toEqual([4_350_000, 7_450_000, 13_200_000, 17_500_000, null]);
      const desc = await http().get('/api/vehicles?sort=price_desc').expect(200);
      expect(desc.body.data.map((v: { price: number | null }) => v.price)).toEqual([17_500_000, 13_200_000, 7_450_000, 4_350_000, null]);
    });

    it('sorts by mileage and year', async () => {
      const mileage = await http().get('/api/vehicles?sort=mileage_asc').expect(200);
      expect(mileage.body.data[0].slug).toBe('suzuki-swift-2024');
      const year = await http().get('/api/vehicles?sort=year_desc').expect(200);
      expect(year.body.data.slice(0, 2).every((v: { year: number }) => v.year === 2024)).toBe(true);
    });

    it('returns featured vehicles for the homepage', async () => {
      const res = await http().get('/api/vehicles?featured=true').expect(200);
      expect(res.body.meta.total).toBe(3);
    });

    it('rejects invalid query parameters with field errors', async () => {
      const res = await http().get('/api/vehicles?condition=OLD&sort=cheapest').expect(400);
      expect(res.body).toMatchObject({ success: false, message: 'Validation failed' });
      expect(Object.keys(res.body.errors).sort()).toEqual(['condition', 'sort']);
    });

    it('exposes filter facets', async () => {
      const res = await http().get('/api/vehicles/facets').expect(200);
      expect(res.body.data.makes).toEqual([
        { value: 'Honda', count: 1 },
        { value: 'Suzuki', count: 1 },
        { value: 'Toyota', count: 3 },
      ]);
      expect(res.body.data.years).toEqual({ min: 2021, max: 2024 });
    });
  });

  describe('GET /api/vehicles/:slug', () => {
    it('returns a vehicle with its images', async () => {
      const res = await http().get('/api/vehicles/toyota-hilux-2023').expect(200);
      expect(res.body.data).toMatchObject({ make: 'Toyota', model: 'Hilux', status: 'RESERVED' });
      expect(res.body.data.images).toHaveLength(1);
    });

    it('returns 404 with a consistent error body', async () => {
      const res = await http().get('/api/vehicles/does-not-exist').expect(404);
      expect(res.body).toEqual({ success: false, statusCode: 404, message: 'Vehicle not found' });
    });
  });

  describe('write operations', () => {
    const newVehicle = {
      make: 'Kia',
      model: 'Sportage',
      variant: 'AWD',
      year: 2024,
      condition: 'USED',
      bodyType: 'SUV',
      fuelType: 'PETROL',
      transmission: 'AUTOMATIC',
      mileage: 6000,
      price: null,
      featured: true,
    };
    let createdId: string;

    it('POST requires authentication', async () => {
      await http().post('/api/vehicles').send(newVehicle).expect(401);
    });

    it('POST validates the body', async () => {
      const res = await http().post('/api/vehicles').set('Cookie', admin).send({ make: '', year: 1800 }).expect(400);
      expect(res.body.errors).toHaveProperty('make');
      expect(res.body.errors).toHaveProperty('year');
      expect(res.body.errors).toHaveProperty('condition');
    });

    it('POST creates a vehicle with a readable slug (staff allowed)', async () => {
      const res = await http().post('/api/vehicles').set('Cookie', staff).send(newVehicle).expect(201);
      expect(res.body.data).toMatchObject({ slug: 'kia-sportage-2024', status: 'AVAILABLE', price: null, isDemo: false });
      createdId = res.body.data.id;
      await http().get('/api/vehicles/kia-sportage-2024').expect(200);
    });

    it('POST de-duplicates slugs', async () => {
      const res = await http().post('/api/vehicles').set('Cookie', admin).send(newVehicle).expect(201);
      expect(res.body.data.slug).toBe('kia-sportage-2024-2');
    });

    it('PATCH updates fields and marks a vehicle sold', async () => {
      const res = await http()
        .patch(`/api/vehicles/${createdId}`)
        .set('Cookie', admin)
        .send({ status: 'SOLD', price: 9_900_000, featured: false, variant: '' })
        .expect(200);
      expect(res.body.data).toMatchObject({ status: 'SOLD', price: 9_900_000, featured: false, variant: null });
      expect(res.body.data.soldAt).not.toBeNull();
    });

    it('PATCH rejects unknown fields', async () => {
      await http().patch(`/api/vehicles/${createdId}`).set('Cookie', admin).send({ hacked: true }).expect(400);
    });

    it('manages images: upload, set primary, reorder, delete', async () => {
      const jpeg = await testJpeg();
      const upload = await http()
        .post(`/api/vehicles/${createdId}/images`)
        .set('Cookie', staff)
        .attach('images', jpeg, { filename: 'one.jpg', contentType: 'image/jpeg' })
        .attach('images', jpeg, { filename: 'two.jpg', contentType: 'image/jpeg' })
        .expect(201);
      const [first, second] = upload.body.data;
      expect(first.isPrimary).toBe(true);
      expect(first.url).toMatch(/^\/uploads\/vehicles\/.+\.webp$/);
      await http().get(first.url).expect(200).expect('Content-Type', 'image/webp');

      const primary = await http().patch(`/api/vehicles/${createdId}/images/${second.id}`).set('Cookie', staff).send({ isPrimary: true }).expect(200);
      expect(primary.body.data.find((i: { id: string }) => i.id === second.id).isPrimary).toBe(true);
      expect(primary.body.data.filter((i: { isPrimary: boolean }) => i.isPrimary)).toHaveLength(1);

      const reordered = await http()
        .patch(`/api/vehicles/${createdId}/images/reorder`)
        .set('Cookie', staff)
        .send({ imageIds: [second.id, first.id] })
        .expect(200);
      expect(reordered.body.data.map((i: { id: string }) => i.id)).toEqual([second.id, first.id]);

      const after = await http().delete(`/api/vehicles/${createdId}/images/${second.id}`).set('Cookie', staff).expect(200);
      expect(after.body.data).toHaveLength(1);
      expect(after.body.data[0].isPrimary).toBe(true);
    });

    it('rejects non-image uploads', async () => {
      const res = await http()
        .post(`/api/vehicles/${createdId}/images`)
        .set('Cookie', staff)
        .attach('images', Buffer.from('not an image'), { filename: 'x.jpg', contentType: 'image/jpeg' })
        .expect(400);
      expect(res.body.success).toBe(false);
    });

    it('DELETE is restricted to admins', async () => {
      await http().delete(`/api/vehicles/${createdId}`).expect(401);
      const res = await http().delete(`/api/vehicles/${createdId}`).set('Cookie', staff).expect(403);
      expect(res.body.message).toMatch(/permission/);
    });

    it('DELETE removes the vehicle', async () => {
      await http().delete(`/api/vehicles/${createdId}`).set('Cookie', admin).expect(200);
      await http().get('/api/vehicles/kia-sportage-2024').expect(404);
      await http().delete(`/api/vehicles/${createdId}`).set('Cookie', admin).expect(404);
    });
  });
});
