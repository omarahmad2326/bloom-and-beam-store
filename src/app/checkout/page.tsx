import type { Metadata } from 'next';
import Checkout from '@/views/Checkout';
import { getQueryClient, prefetchShell } from '@/lib/server/query';
import { Hydrated } from '@/lib/server/Hydrated';

export const metadata: Metadata = { title: { absolute: 'Checkout | Mr.Bedmed' }, robots: { index: false, follow: false } };

export default async function Page() {
  const qc = getQueryClient();
  await prefetchShell(qc);
  return (
    <Hydrated qc={qc}>
      <Checkout />
    </Hydrated>
  );
}
