import type { Metadata } from 'next';
import ServiceDetail from '@/views/ServiceDetail';
import { queries } from '@/queries';
import { getQueryClient, prefetchShell } from '@/lib/server/query';
import { Hydrated } from '@/lib/server/Hydrated';
import { notFoundMetadata, serviceMetadata } from '@/lib/server/metadata';
import { redirectOrNotFound } from '@/lib/server/notFound';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = await getQueryClient().fetchQuery(queries.service(slug));
  return service ? serviceMetadata(service) : notFoundMetadata;
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const qc = getQueryClient();
  const [service] = await Promise.all([qc.fetchQuery(queries.service(slug)), prefetchShell(qc)]);
  if (!service) await redirectOrNotFound(`/services/${slug}`);
  return (
    <Hydrated qc={qc}>
      <ServiceDetail />
    </Hydrated>
  );
}
