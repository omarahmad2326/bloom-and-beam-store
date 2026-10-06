import type { Metadata } from 'next';
import Auth from '@/views/Auth';
import { getQueryClient, prefetchShell } from '@/lib/server/query';
import { Hydrated } from '@/lib/server/Hydrated';

export const metadata: Metadata = { title: { absolute: 'Sign In | Mr.Bedmed' }, robots: { index: false, follow: false } };

export default async function Page() {
  const qc = getQueryClient();
  await prefetchShell(qc);
  return (
    <Hydrated qc={qc}>
      <Auth />
    </Hydrated>
  );
}
