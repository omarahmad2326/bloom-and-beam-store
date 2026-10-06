/** Public origin used for canonical URLs and structured data. */
export const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://mrbedmed.com').replace(/\/+$/, '');

/** Organization name used in structured data. */
export const SITE_NAME = 'Mrbedmed';

/** Default publisher logo; can be overridden from Dashboard → Contact Info. */
export const DEFAULT_LOGO_PATH = '/favicon.png';

export function absoluteUrl(pathOrUrl: string | null | undefined): string | undefined {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}
