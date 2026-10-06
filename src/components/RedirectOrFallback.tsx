import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { redirectLookupKeys } from '@/lib/redirects';

/**
 * Used where a page would otherwise show "not found": if the current URL has a
 * redirect (e.g. an old slug), go to the new URL; otherwise render `fallback`.
 *
 * Search engines get a real 301 from the edge redirect worker; this keeps
 * visitors and in-app navigation working even without it.
 */
export function RedirectOrFallback({ fallback }: { fallback: React.ReactNode }) {
  const { pathname, search, hash } = useLocation();
  const keys = redirectLookupKeys(pathname);

  const { data, isLoading } = useQuery({
    queryKey: ['redirect', keys[0]],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('redirects')
        .select('from_path, to_path')
        .in('from_path', keys);
      if (error) return null;
      return data?.find((r) => r.from_path === keys[0]) ?? data?.[0] ?? null;
    },
  });

  const external = data && /^https?:\/\//i.test(data.to_path);
  useEffect(() => {
    if (external) window.location.replace(data!.to_path);
  }, [external, data]);

  if (isLoading || external) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center" aria-busy="true">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (data) {
    const target = data.to_path.includes('?') ? data.to_path : `${data.to_path}${search}`;
    return <Navigate to={`${target}${hash}`} replace />;
  }

  return <>{fallback}</>;
}
