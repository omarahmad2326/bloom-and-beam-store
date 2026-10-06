import type { Metadata } from 'next';
import { Layout } from '@/components/layout/Layout';
import { getQueryClient, prefetchShell } from '@/lib/server/query';
import { Hydrated } from '@/lib/server/Hydrated';
import UnsubscribeView from '@/views/NewsletterUnsubscribe';

export const metadata: Metadata = {
  title: { absolute: 'Unsubscribe | Mr.Bedmed' },
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await searchParams;
  const qc = getQueryClient();
  await prefetchShell(qc);
  return (
    <Hydrated qc={qc}>
      <Layout>
        <UnsubscribeView token={token} />
      </Layout>
    </Hydrated>
  );
}
