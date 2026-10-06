import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { canonicalFor, setCanonicalLink } from '@/lib/site';

/**
 * Keeps <link rel="canonical"> in step with in-app navigation. The first page load already has the
 * right tag in its HTML source (added by nginx); pages that know a more specific canonical
 * (e.g. product slug) override it through SEOHead, whose effect runs after this one.
 */
export function CanonicalSync() {
  const { pathname } = useLocation();
  useEffect(() => {
    setCanonicalLink(canonicalFor(pathname));
  }, [pathname]);
  return null;
}
