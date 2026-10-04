import { isApiPath, proxyToApi } from './api-proxy';

describe('API proxy (Netlify edge)', () => {
  it('only forwards API paths', () => {
    expect(isApiPath('/api/vehicles')).toBe(true);
    expect(isApiPath('/uploads/vehicles/a-lg.webp')).toBe(true);
    expect(isApiPath('/sitemap.xml')).toBe(true);
    expect(isApiPath('/robots.txt')).toBe(true);
    expect(isApiPath('/inventory')).toBe(false);
    expect(isApiPath('/apis')).toBe(false);
    expect(isApiPath('/')).toBe(false);
  });

  it('forwards method, path, query, cookies and body to the API origin', async () => {
    let seen: { url: string; init: RequestInit & { duplex?: string } } | undefined;
    const fakeFetch = (async (url: string, init: RequestInit) => {
      seen = { url, init };
      return new Response('{"success":true}', { status: 201, headers: { 'content-type': 'application/json', 'set-cookie': 'am_session=abc; HttpOnly' } });
    }) as unknown as typeof fetch;

    const request = new Request('https://site.netlify.app/api/enquiries?x=1', {
      method: 'POST',
      headers: { cookie: 'am_session=old', 'content-type': 'application/json', 'x-forwarded-for': '6.6.6.6' },
      body: '{"name":"Ali"}',
    });
    const response = await proxyToApi(request, 'https://api.example.com/', '203.0.113.7', fakeFetch);

    expect(seen!.url).toBe('https://api.example.com/api/enquiries?x=1');
    expect(seen!.init.method).toBe('POST');
    expect(seen!.init.duplex).toBe('half');
    const headers = new Headers(seen!.init.headers);
    expect(headers.get('cookie')).toBe('am_session=old');
    expect(headers.get('x-forwarded-for')).toBe('203.0.113.7'); // client IP replaces the spoofable header
    expect(headers.get('x-forwarded-host')).toBe('site.netlify.app');
    expect(headers.get('x-forwarded-proto')).toBe('https');
    expect(headers.has('host')).toBe(false);

    expect(response.status).toBe(201);
    expect(response.headers.get('set-cookie')).toContain('am_session=abc');
    expect(await response.text()).toBe('{"success":true}');
  });

  it('sends no body for GET and strips encoding headers from the response', async () => {
    let init: RequestInit | undefined;
    const fakeFetch = (async (_url: string, i: RequestInit) => {
      init = i;
      return new Response('ok', { headers: { 'content-encoding': 'gzip', 'content-length': '999' } });
    }) as unknown as typeof fetch;

    const response = await proxyToApi(new Request('https://site/api/vehicles'), 'https://api', undefined, fakeFetch);
    expect(init!.body).toBeUndefined();
    expect(new Headers(init!.headers).has('x-forwarded-for')).toBe(false);
    expect(response.headers.has('content-encoding')).toBe(false);
    expect(response.headers.has('content-length')).toBe(false);
  });

  it('returns a JSON 502 when the API cannot be reached', async () => {
    const failingFetch = (async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    const response = await proxyToApi(new Request('https://site/api/health'), 'https://down', undefined, failingFetch);
    expect(response.status).toBe(502);
    expect((await response.json()).success).toBe(false);
  });
});
