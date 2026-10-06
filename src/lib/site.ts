/** Public origin used for canonical URLs and structured data. */
export const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://mrbedmed.com').replace(/\/+$/, '');

/** Organization name used in structured data. */
export const SITE_NAME = 'Mrbedmed';

/** Default publisher logo; can be overridden from Dashboard → Contact Info. */
export const DEFAULT_LOGO_PATH = '/favicon.png';

/**
 * Canonical URL for a path, mirroring the nginx rule (scripts/setup-nginx-canonical.sh):
 * https + main domain, no query string, no trailing slash, plain URL characters only.
 */
export function canonicalFor(pathname: string): string | undefined {
  const path = pathname.split(/[?#]/)[0];
  if (!/^\/[A-Za-z0-9._~%/-]*$/.test(path)) return undefined;
  const trimmed = path.length > 1 ? path.replace(/\/+$/, '') || '/' : path;
  return `${SITE_URL}${trimmed}`;
}

/** Create or update the single <link rel="canonical"> in <head>. */
export function setCanonicalLink(href: string | undefined) {
  if (!href || typeof document === 'undefined') return;
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  if (link.href !== href) link.href = href;
}

export function absoluteUrl(pathOrUrl: string | null | undefined): string | undefined {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}
