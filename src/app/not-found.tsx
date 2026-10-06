import type { Metadata } from 'next';
import { NotFoundContent } from '@/views/NotFound';
import { Layout } from '@/components/layout/Layout';
import { getQueryClient, prefetchShell } from '@/lib/server/query';
import { Hydrated } from '@/lib/server/Hydrated';

// Served with HTTP 404 (with the normal header and footer, so visitors can carry on browsing).
// Redirects were already checked on the server before this renders.
export const metadata: Metadata = { title: { absolute: 'Page not found | Mr.Bedmed' }, robots: { index: false } };

export default async function NotFound() {
  const qc = getQueryClient();
  await prefetchShell(qc);
  return (
    <Hydrated qc={qc}>
      <Layout>
        <NotFoundContent />
      </Layout>
    </Hydrated>
  );
}
