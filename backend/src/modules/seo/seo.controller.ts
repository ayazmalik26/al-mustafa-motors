import { Controller, Get, Header } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import { Public, RawResponse } from '../../common/decorators/auth.decorators.js';
import { VehiclesService } from '../vehicles/vehicles.service.js';

const STATIC_PAGES: { path: string; priority: string; changefreq: string }[] = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/inventory', priority: '0.9', changefreq: 'daily' },
  { path: '/sell-exchange', priority: '0.7', changefreq: 'monthly' },
  { path: '/about', priority: '0.5', changefreq: 'monthly' },
  { path: '/contact', priority: '0.6', changefreq: 'monthly' },
];

const xmlEscape = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);

/**
 * Served at the site root (outside the /api prefix). The Angular SSR server and the
 * dev proxy forward /sitemap.xml and /robots.txt here.
 */
@Public()
@RawResponse()
@SkipThrottle()
@Controller()
export class SeoController {
  constructor(
    private readonly vehicles: VehiclesService,
    private readonly config: ConfigService,
  ) {}

  private get siteUrl() {
    return this.config.get<string>('FRONTEND_URL', 'http://localhost:4200');
  }

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=900')
  async sitemap(): Promise<string> {
    const vehicles = await this.vehicles.sitemapEntries();
    const urls = [
      ...STATIC_PAGES.map((p) => `  <url><loc>${xmlEscape(this.siteUrl + p.path)}</loc><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`),
      ...vehicles.map(
        (v) =>
          `  <url><loc>${xmlEscape(`${this.siteUrl}/inventory/${v.slug}`)}</loc><lastmod>${v.updatedAt.toISOString()}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`,
      ),
    ];
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  }

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  robots(): string {
    return ['User-agent: *', 'Allow: /', 'Disallow: /admin', 'Disallow: /api/', '', `Sitemap: ${this.siteUrl}/sitemap.xml`, ''].join('\n');
  }
}
