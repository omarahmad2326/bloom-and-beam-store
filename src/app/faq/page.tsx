import type { Metadata } from 'next';
import FAQ from '@/views/FAQ';
import { queries } from '@/queries';
import { getQueryClient, prefetchShell } from '@/lib/server/query';
import { Hydrated } from '@/lib/server/Hydrated';
import { pageMetadata } from '@/lib/server/metadata';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'FAQ - Frequently Asked Questions | Mr.Bedmed',
    description: 'Find answers to common questions about Mr.Bedmed medical equipment, warranty, shipping, installation, and more.',
    path: '/faq',
  });
}

export default async function Page() {
  const qc = getQueryClient();
  await Promise.all([
    prefetchShell(qc),
    qc.prefetchQuery(queries.faqs()),
  ]);
  return (
    <Hydrated qc={qc}>
      <FAQ />
    </Hydrated>
  );
}
