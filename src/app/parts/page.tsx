import type { Metadata } from 'next';
import Parts from '@/views/Parts';
import { queries } from '@/queries';
import { getQueryClient, prefetchShell } from '@/lib/server/query';
import { Hydrated } from '@/lib/server/Hydrated';
import { pageMetadata } from '@/lib/server/metadata';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'Spare Parts - OEM Replacement Parts | Mr.Bedmed',
    description: 'OEM replacement parts for all Mr.Bedmed medical equipment. Search by manufacturer, model, or part number.',
    path: '/parts',
  });
}

export default async function Page() {
  const qc = getQueryClient();
  await Promise.all([
    prefetchShell(qc),
    qc.prefetchQuery(queries.parts()),
  ]);
  return (
    <Hydrated qc={qc}>
      <Parts />
    </Hydrated>
  );
}
