import type { Metadata } from 'next';
import SitePage from '@/views/SitePage';
import { queries } from '@/queries';
import { getQueryClient, prefetchShell } from '@/lib/server/query';
import { Hydrated } from '@/lib/server/Hydrated';
import { notFoundMetadata, sitePageMetadata } from '@/lib/server/metadata';
import { redirectOrNotFound } from '@/lib/server/notFound';

// Admin-managed pages (Privacy, Terms, Warranty, …) at /{slug}. App routes take precedence.
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).slug.toLowerCase();
  const page = await getQueryClient().fetchQuery(queries.sitePage(slug));
  return page ? { ...sitePageMetadata(page), ...(page.published ? {} : { robots: { index: false } }) } : notFoundMetadata;
}

export default async function ContentPage({ params }: Props) {
  const { slug: raw } = await params;
  const slug = raw.toLowerCase();
  const qc = getQueryClient();
  const [page] = await Promise.all([qc.fetchQuery(queries.sitePage(slug)), prefetchShell(qc)]);
  if (!page) await redirectOrNotFound(`/${raw}`);
  return (
    <Hydrated qc={qc}>
      <SitePage />
    </Hydrated>
  );
}
