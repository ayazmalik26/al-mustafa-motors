import { AngularAppEngine, createRequestHandler } from '@angular/ssr';
import { getAllowedHosts, getContext, getTrustProxyHeaders } from '@netlify/angular-runtime/app-engine.js';
import { isApiPath, proxyToApi } from './app/core/http/api-proxy';
import { readServerEnv } from './app/core/http/server-env';

/**
 * Server entry used by Netlify (as an Edge Function) and by the Angular dev server (`ng serve`).
 * It only uses Web-standard APIs so it can run on Netlify's Deno-based edge runtime.
 *
 * - /api, /uploads, /sitemap.xml and /robots.txt are forwarded to the NestJS API at
 *   API_INTERNAL_URL (a Netlify environment variable scoped to "Functions").
 * - Everything else is rendered by Angular.
 *
 * Self-hosting on Node (Docker, VPS, `npm run start:prod`) uses `server.node.ts` instead
 * (`npm run build:node`).
 */
const onNetlify = !!readServerEnv('SITE_ID');
const extraHosts = (readServerEnv('NG_ALLOWED_HOSTS') ?? '')
  .split(',')
  .map((h) => h.trim())
  .filter(Boolean);

const angularAppEngine = new AngularAppEngine({
  // On Netlify: the site's netlify.app hostnames and custom domain. Locally: localhost.
  allowedHosts: [...(onNetlify ? getAllowedHosts() : ['localhost', '127.0.0.1']), ...extraHosts],
  trustProxyHeaders: getTrustProxyHeaders(),
});

export async function netlifyAppEngineHandler(request: Request): Promise<Response> {
  const context = getContext();

  if (isApiPath(new URL(request.url).pathname)) {
    const apiOrigin = readServerEnv('API_INTERNAL_URL');
    if (!apiOrigin) {
      return Response.json({ success: false, statusCode: 503, message: 'API_INTERNAL_URL is not configured.' }, { status: 503 });
    }
    return proxyToApi(request, apiOrigin, context?.ip);
  }

  const result = await angularAppEngine.handle(request, context);
  return result || new Response('Not found', { status: 404 });
}

/** Request handler used by the Angular CLI (dev server and build). */
export const reqHandler = createRequestHandler(netlifyAppEngineHandler);
