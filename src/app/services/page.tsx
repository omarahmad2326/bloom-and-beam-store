import type { Metadata } from 'next';
import Services from '@/views/Services';
import { queries } from '@/queries';
import { getQueryClient, prefetchShell } from '@/lib/server/query';
import { Hydrated } from '@/lib/server/Hydrated';
import { pageMetadata } from '@/lib/server/metadata';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'Medical Equipment Services in Texas | Mr.Bedmed',
    description: 'Biomedical equipment inspection, repair, calibration, preventive maintenance, refurbishing, sales and rental for Texas healthcare facilities.',
    path: '/services',
  });
}

export default async function Page() {
  const qc = getQueryClient();
  await Promise.all([
    prefetchShell(qc),
    qc.prefetchQuery(queries.services()),
  ]);
  return (
    <Hydrated qc={qc}>
      <Services />
    </Hydrated>
  );
}
