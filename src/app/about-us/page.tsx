import type { Metadata } from 'next';
import About from '@/views/About';
import { queries } from '@/queries';
import { getQueryClient, prefetchShell } from '@/lib/server/query';
import { Hydrated } from '@/lib/server/Hydrated';
import { pageMetadata, aboutMetadata } from '@/lib/server/metadata';

export async function generateMetadata(): Promise<Metadata> {
  return aboutMetadata(await getQueryClient().fetchQuery(queries.aboutPage()));
}

export default async function Page() {
  const qc = getQueryClient();
  await Promise.all([
    prefetchShell(qc),
    qc.prefetchQuery(queries.aboutPage()),
  ]);
  return (
    <Hydrated qc={qc}>
      <About />
    </Hydrated>
  );
}
