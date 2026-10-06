import { SITE_URL } from '@/lib/site';

/**
 * Normalise what an admin types/pastes ("https://mrbedmed.com/products/x/", "products/x")
 * into a site path ("/products/x"). External URLs are kept as-is (only valid as a target).
 */
export function normalizeRedirectPath(input: string, { allowExternal = false } = {}): string {
  let value = input.trim();
  if (!value) return '';

  const siteHost = new URL(SITE_URL).host.replace(/^www\./, '');
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const host = url.host.replace(/^www\./, '');
      if (host !== siteHost) return allowExternal ? url.toString() : '';
      value = url.pathname + url.search;
    } catch {
      return '';
    }
  }

  if (!value.startsWith('/')) value = `/${value}`;
  value = value.replace(/\/{2,}/g, '/');
  if (value.length > 1) value = value.replace(/\/+$/, '');
  return value;
}

/** Candidate keys to look up for the current location (exact, then lowercase). */
export function redirectLookupKeys(pathname: string): string[] {
  let path = pathname;
  try {
    path = decodeURI(pathname);
  } catch {
    /* keep raw */
  }
  const normalized = normalizeRedirectPath(path);
  return Array.from(new Set([normalized, normalized.toLowerCase()]));
}
