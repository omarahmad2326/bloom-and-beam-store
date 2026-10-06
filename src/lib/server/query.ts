import { cache } from 'react';
import { QueryClient, dehydrate } from '@tanstack/react-query';
import { queries } from '@/queries';

/**
 * One QueryClient per server request (React `cache`), shared by generateMetadata and the page,
 * so the data each page needs is fetched once and then sent to the browser with the HTML.
 */
export const getQueryClient = cache(
  () => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1 } } }),
);

/** Data every page renders: header menu, footer, footer links, contact details. */
export async function prefetchShell(qc: QueryClient) {
  await Promise.all([
    qc.prefetchQuery(queries.contactInfo()),
    qc.prefetchQuery(queries.homeMenu()),
    qc.prefetchQuery(queries.footer()),
    qc.prefetchQuery(queries.footerPages()),
  ]);
}

export const dehydrated = (qc: QueryClient) => dehydrate(qc);
