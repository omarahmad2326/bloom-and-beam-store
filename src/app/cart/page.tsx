import type { Metadata } from 'next';
import Cart from '@/views/Cart';
import { getQueryClient, prefetchShell } from '@/lib/server/query';
import { Hydrated } from '@/lib/server/Hydrated';

export const metadata: Metadata = { title: { absolute: 'Cart | Mr.Bedmed' }, robots: { index: false, follow: false } };

export default async function Page() {
  const qc = getQueryClient();
  await prefetchShell(qc);
  return (
    <Hydrated qc={qc}>
      <Cart />
    </Hydrated>
  );
}
