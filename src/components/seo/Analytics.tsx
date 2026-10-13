'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';

/** Dashboard and sign-in pages: admin visits must not count as website traffic. */
export const isPrivatePath = (path: string) => /^\/(admin|auth)(\/|$)/.test(path);

/**
 * Google Analytics and Microsoft Clarity (ids from Dashboard → SEO & Tracking). They load only on
 * the public website; on a direct visit to the dashboard nothing loads, and if an admin moves from
 * the website into the dashboard, Google Analytics is switched off for those pages.
 */
export function Analytics({ gaId, clarityId }: { gaId: string; clarityId: string }) {
  const pathname = usePathname() || '/';
  const isPrivate = isPrivatePath(pathname);

  useEffect(() => {
    if (!gaId) return;
    (window as unknown as Record<string, boolean>)[`ga-disable-${gaId}`] = isPrivate;
  }, [gaId, isPrivate]);

  if (isPrivate) return null;

  return (
    <>
      {clarityId && (
        // The id must not be "clarity": an element id becomes window.clarity and breaks the tag.
        <Script id="ms-clarity-init" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", ${JSON.stringify(clarityId)});`}
        </Script>
      )}
      {gaId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`} strategy="afterInteractive" />
          <Script id="google-analytics-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', ${JSON.stringify(gaId)});`}
          </Script>
        </>
      )}
    </>
  );
}
