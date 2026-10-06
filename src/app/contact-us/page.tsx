import type { Metadata } from 'next';
import Contact from '@/views/Contact';
import { queries } from '@/queries';
import { getQueryClient, prefetchShell } from '@/lib/server/query';
import { Hydrated } from '@/lib/server/Hydrated';
import { pageMetadata, contactMetadata } from '@/lib/server/metadata';

export async function generateMetadata(): Promise<Metadata> {
  return contactMetadata(await getQueryClient().fetchQuery(queries.contactPage()));
}

export default async function Page() {
  const qc = getQueryClient();
  await Promise.all([
    prefetchShell(qc),
    qc.prefetchQuery(queries.contactPage()),
  ]);
  return (
    <Hydrated qc={qc}>
      <Contact />
    </Hydrated>
  );
}
