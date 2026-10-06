import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from './worker.js';

const env = { SUPABASE_URL: 'https://proj.supabase.co', SUPABASE_ANON_KEY: 'anon' };
const ORIGIN_OK = new Response('origin', { status: 200 });

function mockFetch(rows) {
  const calls = [];
  globalThis.fetch = vi.fn(async (input) => {
    const url = typeof input === 'string' ? input : input.url;
    calls.push(url);
    if (url.startsWith(env.SUPABASE_URL)) {
      if (rows instanceof Error) throw rows;
      const from = new URL(url).searchParams.get('from_path');
      const keys = [...from.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
      return new Response(JSON.stringify(rows.filter((r) => keys.includes(r.from_path))), { status: 200 });
    }
    return ORIGIN_OK.clone();
  });
  return calls;
}

const get = (path) => worker.fetch(new Request(`https://mrbedmed.com${path}`), env);

afterEach(() => vi.restoreAllMocks());

describe('edge redirect worker', () => {
  const rows = [{ from_path: '/products/test-bed-2', to_path: '/products/test-bed-two', status_code: 301 }];

  it('returns a 301 to the new URL for an old slug', async () => {
    mockFetch(rows);
    const res = await get('/products/test-bed-2');
    expect(res.status).toBe(301);
    expect(res.headers.get('Location')).toBe('https://mrbedmed.com/products/test-bed-two');
  });

  it('keeps the query string and ignores a trailing slash', async () => {
    mockFetch(rows);
    const res = await get('/products/test-bed-2/?utm_source=x');
    expect(res.headers.get('Location')).toBe('https://mrbedmed.com/products/test-bed-two?utm_source=x');
  });

  it('passes through when there is no redirect', async () => {
    mockFetch(rows);
    const res = await get('/products/test-bed-two');
    expect(res.status).toBe(200);
  });

  it('does not look up static assets', async () => {
    const calls = mockFetch(rows);
    await get('/assets/index-abc.js');
    expect(calls.some((c) => c.startsWith(env.SUPABASE_URL))).toBe(false);
  });

  it('lowercases category URLs', async () => {
    mockFetch([]);
    const res = await get('/category/ICU-bed');
    expect(res.status).toBe(301);
    expect(res.headers.get('Location')).toBe('https://mrbedmed.com/category/icu-bed');
  });

  it('fails open when Supabase is unreachable', async () => {
    mockFetch(new Error('down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await get('/products/test-bed-2');
    expect(res.status).toBe(200);
  });

  it('supports external targets', async () => {
    mockFetch([{ from_path: '/old', to_path: 'https://example.com/new', status_code: 301 }]);
    const res = await get('/old');
    expect(res.headers.get('Location')).toBe('https://example.com/new');
  });
});
