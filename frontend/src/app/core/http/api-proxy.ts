/** Paths served by the NestJS API rather than by Angular. */
const API_PREFIXES = ['/api/', '/uploads/'];
const API_FILES = ['/sitemap.xml', '/robots.txt'];

export function isApiPath(pathname: string): boolean {
  return API_FILES.includes(pathname) || API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/** Hop-by-hop / transport headers that must not be copied between connections. */
const STRIPPED_RESPONSE_HEADERS = ['content-encoding', 'content-length', 'transfer-encoding', 'connection'];

/**
 * Forwards a request to the API and streams the answer back, keeping the website and API on one
 * origin (so the httpOnly admin session cookie works). Used by the Netlify Edge Function, which
 * cannot run the Express proxy used by the Node server.
 *
 * The client IP replaces any incoming X-Forwarded-For, so visitors cannot spoof the address the
 * API uses for rate limiting.
 */
export async function proxyToApi(
  request: Request,
  apiOrigin: string,
  clientIp?: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const url = new URL(request.url);
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('x-forwarded-for');
  if (clientIp) headers.set('x-forwarded-for', clientIp);
  headers.set('x-forwarded-host', url.host);
  headers.set('x-forwarded-proto', url.protocol.replace(':', ''));

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
  const init: RequestInit & { duplex?: 'half' } = {
    method: request.method,
    headers,
    redirect: 'manual',
    ...(hasBody && { body: request.body, duplex: 'half' }),
  };

  let upstream: Response;
  try {
    upstream = await fetchImpl(`${apiOrigin.replace(/\/+$/, '')}${url.pathname}${url.search}`, init);
  } catch {
    return Response.json({ success: false, statusCode: 502, message: 'The API is not reachable right now. Please try again.' }, { status: 502 });
  }

  // fetch() has already decoded the body, so encoding/length headers no longer describe it.
  const responseHeaders = new Headers(upstream.headers);
  for (const name of STRIPPED_RESPONSE_HEADERS) responseHeaders.delete(name);
  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: responseHeaders });
}
