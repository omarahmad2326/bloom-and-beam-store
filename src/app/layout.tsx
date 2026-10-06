import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import '@/index.css';
import { Providers } from './providers';
import { SITE_URL } from '@/lib/site';

// Every page is rendered on the server per request, so admin edits show up immediately and
// pages that read the query string (?search=, ?product=) are fully in the HTML.
export const dynamic = 'force-dynamic';

const DEFAULT_TITLE = 'Mr.Bedmed | Hospital Beds & Stretcher Solutions';
const DEFAULT_DESCRIPTION =
  'Mr.Bedmed - Your trusted partner for hospital beds and stretcher solutions. Sales, rentals, and expert service for healthcare facilities.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  authors: [{ name: 'Mr.Bedmed' }],
  icons: { icon: '/favicon.png' },
  verification: { google: 'cwYTQFNoWwxVD-Buidhtv_iL6rciP1ha2qanxMgfLng' },
  openGraph: {
    title: DEFAULT_TITLE,
    description: 'Your trusted partner for hospital beds and stretcher solutions. Sales, rentals, and expert service for healthcare facilities.',
    type: 'website',
    images: [{ url: '/favicon.png' }],
  },
  twitter: { card: 'summary_large_image', site: '@MrBedmed', images: ['/favicon.png'] },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

// Site navigation schema (same on every page). If the main menu changes, update this list.
const siteNavigationSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Mrbedmed',
  url: 'https://mrbedmed.com',
  hasPart: [
    { '@type': 'SiteNavigationElement', name: 'Products', url: 'https://mrbedmed.com/products' },
    { '@type': 'SiteNavigationElement', name: 'Services', url: 'https://mrbedmed.com/services' },
    { '@type': 'SiteNavigationElement', name: 'Parts', url: 'https://mrbedmed.com/parts' },
    { '@type': 'SiteNavigationElement', name: 'About Us', url: 'https://mrbedmed.com/about-us' },
    { '@type': 'SiteNavigationElement', name: 'Contact Us', url: 'https://mrbedmed.com/contact-us' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(siteNavigationSchema) }} />
      </head>
      <body>
        <Providers>{children}</Providers>

        {/* Microsoft Clarity. The id must not be "clarity": an element id becomes window.clarity and breaks the tag. */}
        <Script id="ms-clarity-init" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "x8j4k2099m");`}
        </Script>
        {/* Google Analytics (gtag.js) */}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-N6VD2Z798P" strategy="afterInteractive" />
        <Script id="google-analytics-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', 'G-N6VD2Z798P');`}
        </Script>
      </body>
    </html>
  );
}
