import type { INestApplication } from '@nestjs/common';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { ADMIN_EMAIL, PASSWORD, STAFF_EMAIL, createTestApp, login, resetDatabase } from './helpers.js';

describe('Auth, settings, dashboard & SEO API', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: Awaited<ReturnType<typeof createTestApp>>['http'];

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    http = ctx.http;
    prisma = ctx.prisma;
    await resetDatabase(prisma);
  });

  afterAll(() => app.close());

  describe('authentication', () => {
    it('sets an httpOnly, SameSite=Strict session cookie on login', async () => {
      const res = await http().post('/api/auth/login').send({ email: ADMIN_EMAIL, password: PASSWORD }).expect(200);
      expect(res.body.data.user).toEqual({ id: expect.any(String), name: 'Test Admin', email: ADMIN_EMAIL, role: 'ADMIN' });
      expect(res.body.data).not.toHaveProperty('token');
      const cookie = res.get('Set-Cookie')![0];
      expect(cookie).toMatch(/^am_session=/);
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Strict/i);
    });

    it('accepts the email in any case', async () => {
      await http().post('/api/auth/login').send({ email: ADMIN_EMAIL.toUpperCase(), password: PASSWORD }).expect(200);
    });

    it('rejects wrong credentials without revealing which part was wrong', async () => {
      const wrongPassword = await http().post('/api/auth/login').send({ email: ADMIN_EMAIL, password: 'nope' }).expect(401);
      const unknownUser = await http().post('/api/auth/login').send({ email: 'ghost@test.local', password: 'nope' }).expect(401);
      expect(wrongPassword.body.message).toBe(unknownUser.body.message);
    });

    it('returns the current user for a valid session and 401 otherwise', async () => {
      const cookie = await login(http, STAFF_EMAIL);
      const me = await http().get('/api/auth/me').set('Cookie', cookie).expect(200);
      expect(me.body.data.user.role).toBe('STAFF');
      await http().get('/api/auth/me').expect(401);
      await http().get('/api/auth/me').set('Cookie', 'am_session=forged.token.value').expect(401);
    });

    it('also accepts a bearer token', async () => {
      const cookie = await login(http, ADMIN_EMAIL);
      const token = cookie[0].split(';')[0].split('=')[1];
      await http().get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
    });

    it('locks out deactivated users immediately', async () => {
      const cookie = await login(http, STAFF_EMAIL);
      await prisma.user.update({ where: { email: STAFF_EMAIL }, data: { isActive: false } });
      await http().get('/api/auth/me').set('Cookie', cookie).expect(401);
      await prisma.user.update({ where: { email: STAFF_EMAIL }, data: { isActive: true } });
    });

    it('clears the cookie on logout', async () => {
      const res = await http().post('/api/auth/logout').expect(200);
      expect(res.get('Set-Cookie')![0]).toMatch(/am_session=;/);
    });
  });

  describe('settings', () => {
    it('are public and include derived site/map URLs', async () => {
      const res = await http().get('/api/settings').expect(200);
      expect(res.body.data).toMatchObject({
        businessName: 'Test Motors',
        whatsapp: '+923003334444',
        siteUrl: 'http://localhost:4200',
        mapEmbedUrl: expect.stringMatching(/^https:\/\/www\.google\.com\/maps\?q=.+&output=embed$/),
      });
    });

    it('can only be changed by admins', async () => {
      await http().patch('/api/settings').send({ businessName: 'X' }).expect(401);
      const staff = await login(http, STAFF_EMAIL);
      await http().patch('/api/settings').set('Cookie', staff).send({ businessName: 'X' }).expect(403);
    });

    it('validates and normalises updates', async () => {
      const admin = await login(http, ADMIN_EMAIL);
      const bad = await http()
        .patch('/api/settings')
        .set('Cookie', admin)
        .send({ whatsapp: 'abc', facebookUrl: 'javascript:alert(1)', latitude: 200 })
        .expect(400);
      expect(Object.keys(bad.body.errors).sort()).toEqual(['facebookUrl', 'latitude', 'whatsapp']);

      const ok = await http()
        .patch('/api/settings')
        .set('Cookie', admin)
        .send({ whatsapp: '0336 8440890', latitude: 24.9, longitude: 67.1, instagramUrl: 'https://instagram.com/test', email: '' })
        .expect(200);
      expect(ok.body.data).toMatchObject({ whatsapp: '+923368440890', latitude: 24.9, longitude: 67.1, email: null });
      expect(ok.body.data.mapEmbedUrl).toContain(encodeURIComponent('24.9,67.1'));
    });
  });

  describe('dashboard', () => {
    it('requires authentication', async () => {
      await http().get('/api/dashboard').expect(401);
    });

    it('returns inventory and lead statistics', async () => {
      const staff = await login(http, STAFF_EMAIL);
      const res = await http().get('/api/dashboard').set('Cookie', staff).expect(200);
      expect(res.body.data.vehicles).toEqual({ total: 5, available: 3, reserved: 1, sold: 1, featured: 3 });
      expect(res.body.data.leadsByDay).toHaveLength(14);
      expect(res.body.data.inventoryByMake[0]).toEqual({ make: 'Toyota', count: 3 });
    });
  });

  describe('SEO and security headers', () => {
    it('serves a sitemap with every vehicle', async () => {
      const res = await http().get('/sitemap.xml').expect(200).expect('Content-Type', /xml/);
      expect(res.text).toContain('<loc>http://localhost:4200/inventory/toyota-fortuner-2024</loc>');
      expect(res.text).toContain('<loc>http://localhost:4200/sell-exchange</loc>');
    });

    it('serves robots.txt pointing at the sitemap', async () => {
      const res = await http().get('/robots.txt').expect(200);
      expect(res.text).toContain('Disallow: /admin');
      expect(res.text).toContain('Sitemap: http://localhost:4200/sitemap.xml');
    });

    it('sets helmet security headers and hides x-powered-by', async () => {
      const res = await http().get('/api/health').expect(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('returns a JSON 404 for unknown API routes', async () => {
      const res = await http().get('/api/nope').expect(404);
      expect(res.body.success).toBe(false);
    });
  });
});
