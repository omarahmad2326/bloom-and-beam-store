import type { Metadata } from 'next';
import Index from '@/views/Index';
import { queries } from '@/queries';
import { getQueryClient, prefetchShell } from '@/lib/server/query';
import { Hydrated } from '@/lib/server/Hydrated';
import { pageMetadata } from '@/lib/server/metadata';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'Mr.Bedmed | Hospital Beds & Stretcher Solutions',
    description: 'Mr.Bedmed - Your trusted partner for hospital beds and stretcher solutions. Sales, rentals, and expert service for healthcare facilities.',
    path: '/',
  });
}

export default async function Page() {
  const qc = getQueryClient();
  await Promise.all([
    prefetchShell(qc),
    qc.prefetchQuery(queries.heroSettings()),
    qc.prefetchQuery(queries.featuredProducts()),
  ]);
  return (
    <Hydrated qc={qc}>
      <Index />
    </Hydrated>
  );
}
