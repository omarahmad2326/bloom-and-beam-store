import type { Metadata } from 'next';
import Products from '@/views/Products';
import { queries } from '@/queries';
import { getQueryClient, prefetchShell } from '@/lib/server/query';
import { Hydrated } from '@/lib/server/Hydrated';
import { pageMetadata } from '@/lib/server/metadata';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const beds = (await searchParams).type === 'hospital-beds';
  return pageMetadata({
    title: beds ? 'Hospital Beds & Medical Beds | Mr.Bedmed Products' : 'Medical Equipment & Hospital Stretchers | Mr.Bedmed Products',
    description: beds
      ? 'Browse our complete range of hospital beds including electric, ICU, bariatric, and home care beds.'
      : 'Explore our complete range of premium medical stretchers and hospital equipment. Emergency, ICU, transport, and recovery stretchers.',
    path: '/products',
  });
}

export default async function ProductsPage() {
  const qc = getQueryClient();
  await Promise.all([prefetchShell(qc), qc.prefetchQuery(queries.allProducts()), qc.prefetchQuery(queries.allCategories())]);
  return (
    <Hydrated qc={qc}>
      <Products />
    </Hydrated>
  );
}
