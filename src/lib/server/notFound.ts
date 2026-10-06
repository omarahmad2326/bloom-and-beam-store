import { notFound, permanentRedirect } from 'next/navigation';
import { queries } from '@/queries';
import { redirectLookupKeys } from '@/lib/redirects';
import { getQueryClient } from './query';

/**
 * For a URL with no page: follow its redirect from Dashboard → Redirects if there is one,
 * otherwise respond with a real 404 (not a "soft 404" page with status 200).
 * nginx already answers most redirects with a 301 before the request reaches the app.
 */
export async function redirectOrNotFound(pathname: string): Promise<never> {
  const keys = redirectLookupKeys(pathname);
  const match = await getQueryClient().fetchQuery(queries.redirect(keys)).catch(() => null);
  if (match?.to_path) permanentRedirect(match.to_path);
  notFound();
}
