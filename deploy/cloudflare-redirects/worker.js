/**
 * Mrbedmed edge redirects (Cloudflare Worker).
 *
 * Serves real HTTP 301s for rows in the Supabase `redirects` table (managed in
 * Dashboard → Redirects, plus automatic rows created when a published slug changes).
 * Everything else is passed through to the origin (DigitalOcean) untouched.
 *
 * Env vars (wrangler.toml [vars]):
 *   SUPABASE_URL       https://<project-ref>.supabase.co
 *   SUPABASE_ANON_KEY  the public anon/publishable key (redirects are publicly readable via RLS)
 */

// Static files and app-only paths never redirect; skip the lookup for speed.
const SKIP = /^\/(?:assets|images|admin|auth)(?:\/|$)|\.(?:js|mjs|css|map|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|txt|xml|json|webmanifest|pdf)$/i;

export default {
  async fetch(request, env) {
    if (request.method !== 'GET' && request.method !== 'HEAD') return fetch(request);

    const url = new URL(request.url);
    if (SKIP.test(url.pathname)) return fetch(request);

    const path = normalizePath(url.pathname);
    const keys = [...new Set([path, path.toLowerCase()])];

    try {
      const target = await lookup(keys, env);
      if (target) {
        const isExternal = /^https?:\/\//i.test(target.to_path);
        const location = isExternal
          ? target.to_path
          : new URL(target.to_path + (target.to_path.includes('?') ? '' : url.search), url.origin).toString();
        return redirect(location, target.status_code || 301);
      }
    } catch (err) {
      // Fail open: never take the site down because the lookup failed.
      console.error('redirect lookup failed', err);
    }

    // Category URLs are lowercase (e.g. /category/ICU-bed → /category/icu-bed).
    if (path.startsWith('/category/') && path !== path.toLowerCase()) {
      return redirect(new URL(path.toLowerCase() + url.search, url.origin).toString(), 301);
    }

    return fetch(request);
  },
};

function normalizePath(pathname) {
  let path = pathname;
  try {
    path = decodeURI(pathname);
  } catch {
    /* keep raw */
  }
  path = path.replace(/\/{2,}/g, '/');
  if (path.length > 1) path = path.replace(/\/+$/, '');
  return path;
}

async function lookup(keys, env) {
  const quoted = keys.map((k) => `"${k.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(',');
  const params = new URLSearchParams({ select: 'from_path,to_path,status_code', from_path: `in.(${quoted})` });
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/redirects?${params}`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` },
    // Cache lookups at the edge for a minute so the database is not hit on every page view.
    cf: { cacheTtl: 60, cacheEverything: true },
  });
  if (!res.ok) throw new Error(`Supabase responded ${res.status}`);
  const rows = await res.json();
  return rows.find((r) => r.from_path === keys[0]) || rows[0] || null;
}

function redirect(location, status) {
  return new Response(null, {
    status,
    headers: { Location: location, 'Cache-Control': 'public, max-age=300' },
  });
}
