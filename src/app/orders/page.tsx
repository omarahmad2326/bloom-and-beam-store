import type { Metadata } from 'next';
import OrderHistory from '@/views/OrderHistory';
import { getQueryClient, prefetchShell } from '@/lib/server/query';
import { Hydrated } from '@/lib/server/Hydrated';

export const metadata: Metadata = { title: { absolute: 'Order History | Mr.Bedmed' }, robots: { index: false, follow: false } };

export default async function Page() {
  const qc = getQueryClient();
  await prefetchShell(qc);
  return (
    <Hydrated qc={qc}>
      <OrderHistory />
    </Hydrated>
  );
}
