import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import ProductDetail from '@/views/ProductDetail';
import { queries } from '@/queries';
import { getQueryClient, prefetchShell } from '@/lib/server/query';
import { Hydrated } from '@/lib/server/Hydrated';
import { notFoundMetadata, productMetadata } from '@/lib/server/metadata';
import { redirectOrNotFound } from '@/lib/server/notFound';
import { isValidSlug } from '@/lib/slugify';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getQueryClient().fetchQuery(queries.product(id));
  return product ? productMetadata(product) : notFoundMetadata;
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const qc = getQueryClient();
  const [product] = await Promise.all([qc.fetchQuery(queries.product(id)), prefetchShell(qc)]);
  if (!product) await redirectOrNotFound(`/products/${id}`);
  // Opened by ID (or an old spelling)? The slug URL is the canonical one.
  if (product!.slug && isValidSlug(product!.slug) && id !== product!.slug) permanentRedirect(`/products/${product!.slug}`);
  await qc.prefetchQuery(queries.relatedProducts(product!.category, product!.id));
  return (
    <Hydrated qc={qc}>
      <ProductDetail />
    </Hydrated>
  );
}
