import { storageLocation } from '@/lib/media';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const PASS_HEADERS = ['content-type', 'content-length', 'etag', 'last-modified'];

/**
 * /media/... : serves Media Library images from Supabase Storage under the site's own domain.
 * Cloudflare caches the responses (image extensions are cached by default), so Supabase is only
 * asked once per image and edge location.
 */
async function serve(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const loc = storageLocation(path);
  if (!loc) return new Response('Not found', { status: 404 });

  const upstream = await fetch(
    `${SUPABASE_URL}/storage/v1/object/public/${loc.bucket}/${loc.path.split('/').map(encodeURIComponent).join('/')}`,
    {
      method: req.method === 'HEAD' ? 'HEAD' : 'GET',
      headers: Object.fromEntries(
        ['if-none-match', 'if-modified-since'].flatMap((h) => (req.headers.get(h) ? [[h, req.headers.get(h) as string]] : [])),
      ),
      signal: AbortSignal.timeout(20_000),
    },
  ).catch(() => null);

  if (!upstream) return new Response('Image temporarily unavailable', { status: 502, headers: { 'Cache-Control': 'no-store' } });
  if (upstream.status === 304) return new Response(null, { status: 304 });
  if (!upstream.ok) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'public, max-age=60' } });

  const type = upstream.headers.get('content-type') || '';
  // Only images are served from here (never HTML or scripts under the site's domain).
  if (!/^image\//i.test(type)) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  for (const h of PASS_HEADERS) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  // A week in browsers and Cloudflare; a deleted-and-reuploaded name refreshes within that time.
  headers.set('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
  headers.set('X-Content-Type-Options', 'nosniff');
  if (/svg/i.test(type)) headers.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  return new Response(req.method === 'HEAD' ? null : upstream.body, { status: 200, headers });
}

export const GET = serve;
export const HEAD = serve;
