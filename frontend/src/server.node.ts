import { AngularNodeAppEngine, createNodeRequestHandler, isMainModule, writeResponseToNodeResponse } from '@angular/ssr/node';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { join } from 'node:path';

/**
 * Self-hosted Node.js SSR server (Docker, VPS, `npm run start:prod`), built with `npm run build:node`.
 * Netlify deployments use `server.ts` instead.
 *  - /api, /uploads, /sitemap.xml and /robots.txt are proxied to the NestJS API, so the
 *    whole site (and the httpOnly admin session cookie) lives on one origin.
 *    Set API_PROXY=false if a reverse proxy (nginx, Caddy…) routes those paths instead.
 *  - Static browser assets are served with long-lived caching.
 *  - Everything else is rendered by Angular.
 *
 * Environment: SSR_PORT (default 4000), API_INTERNAL_URL (default http://localhost:3000),
 * NG_ALLOWED_HOSTS (comma-separated hostnames allowed in the Host header in production).
 */
const browserDistFolder = join(import.meta.dirname, '../browser');
const apiTarget = process.env['API_INTERNAL_URL'] || 'http://localhost:3000';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
// Angular validates the Host header against an allow-list. NG_ALLOWED_HOSTS (e.g. "almustafamotors.pk,www.almustafamotors.pk")
// must be set in production; without it only local hostnames are accepted.
const angularApp = new AngularNodeAppEngine({
  allowedHosts: process.env['NG_ALLOWED_HOSTS'] ? undefined : ['localhost', '127.0.0.1', '[::1]'],
});

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

if (process.env['API_PROXY'] !== 'false') {
  app.use(
    createProxyMiddleware({
      target: apiTarget,
      changeOrigin: false,
      xfwd: true,
      // Plain prefixes (http-proxy-middleware v4 does not allow mixing plain paths with globs).
      pathFilter: ['/api/', '/uploads/', '/sitemap.xml', '/robots.txt'],
    }),
  );
}

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['SSR_PORT'] || process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) throw error;
    console.log(`Al-Mustafa Motors web server listening on http://localhost:${port} (API → ${apiTarget})`);
  });
}

/** Request handler used by the Angular CLI dev server and during build. */
export const reqHandler = createNodeRequestHandler(app);
