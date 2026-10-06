import { HydrationBoundary, dehydrate, type QueryClient } from '@tanstack/react-query';

/** Sends the server-fetched query data to the browser so the page hydrates without refetching. */
export function Hydrated({ qc, children }: { qc: QueryClient; children: React.ReactNode }) {
  return <HydrationBoundary state={dehydrate(qc)}>{children}</HydrationBoundary>;
}
