import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import PartDetail from '@/views/PartDetail';
import { queries } from '@/queries';
import { getQueryClient, prefetchShell } from '@/lib/server/query';
import { Hydrated } from '@/lib/server/Hydrated';
import { notFoundMetadata, partMetadata } from '@/lib/server/metadata';
import { redirectOrNotFound } from '@/lib/server/notFound';
import { isValidSlug } from '@/lib/slugify';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const part = await getQueryClient().fetchQuery(queries.part(id));
  return part ? partMetadata(part) : notFoundMetadata;
}

export default async function PartPage({ params }: Props) {
  const { id } = await params;
  const qc = getQueryClient();
  const [part] = await Promise.all([qc.fetchQuery(queries.part(id)), prefetchShell(qc)]);
  if (!part) await redirectOrNotFound(`/part/${id}`);
  if (part!.slug && isValidSlug(part!.slug) && id !== part!.slug) permanentRedirect(`/part/${part!.slug}`);
  return (
    <Hydrated qc={qc}>
      <PartDetail />
    </Hydrated>
  );
}
