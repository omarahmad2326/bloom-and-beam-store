import type { Metadata } from 'next';
import Blog from '@/views/Blog';
import { queries } from '@/queries';
import { getQueryClient, prefetchShell } from '@/lib/server/query';
import { Hydrated } from '@/lib/server/Hydrated';
import { pageMetadata } from '@/lib/server/metadata';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: 'Mr.Bedmed Blog - Medical Equipment Insights',
    description: 'Expert insights, maintenance tips, and industry news for healthcare professionals',
    path: '/blog',
  });
}

export default async function Page() {
  const qc = getQueryClient();
  await Promise.all([
    prefetchShell(qc),
    qc.prefetchQuery(queries.blogPosts()),
  ]);
  return (
    <Hydrated qc={qc}>
      <Blog />
    </Hydrated>
  );
}
