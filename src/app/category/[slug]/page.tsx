import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import CategoryDetail from '@/views/CategoryDetail';
import { queries } from '@/queries';
import { getQueryClient, prefetchShell } from '@/lib/server/query';
import { Hydrated } from '@/lib/server/Hydrated';
import { categoryMetadata, notFoundMetadata } from '@/lib/server/metadata';
import { redirectOrNotFound } from '@/lib/server/notFound';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).slug.toLowerCase();
  const category = await getQueryClient().fetchQuery(queries.category(slug));
  return category ? categoryMetadata(category) : notFoundMetadata;
}

export default async function CategoryPage({ params }: Props) {
  const { slug: raw } = await params;
  const slug = raw.toLowerCase();
  // Category URLs are lowercase: /category/ICU-beds → /category/icu-beds.
  if (raw !== slug) permanentRedirect(`/category/${slug}`);
  const qc = getQueryClient();
  const [category] = await Promise.all([qc.fetchQuery(queries.category(slug)), prefetchShell(qc)]);
  if (!category) await redirectOrNotFound(`/category/${raw}`);
  await qc.prefetchQuery(queries.categoryProducts({ id: category!.id, name: category!.name }));
  return (
    <Hydrated qc={qc}>
      <CategoryDetail />
    </Hydrated>
  );
}
