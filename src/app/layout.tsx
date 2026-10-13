import type { Metadata, Viewport } from 'next';
import '@/index.css';
import { Providers } from './providers';
import { SITE_URL } from '@/lib/site';
import { getSeoSettings } from '@/lib/server/seo';
import { schemaBlockHtml } from '@/lib/seoSettings';
import { Analytics } from '@/components/seo/Analytics';

// Every page is rendered on the server per request, so admin edits show up immediately and
// pages that read the query string (?search=, ?product=) are fully in the HTML.
export const dynamic = 'force-dynamic';

const DEFAULT_TITLE = 'Mr.Bedmed | Hospital Beds & Stretcher Solutions';
const DEFAULT_DESCRIPTION =
  'Mr.Bedmed - Your trusted partner for hospital beds and stretcher solutions. Sales, rentals, and expert service for healthcare facilities.';

export async function generateMetadata(): Promise<Metadata> {
  // Verification codes come from Dashboard → SEO & Tracking.
  const seo = await getSeoSettings();
  return {
    metadataBase: new URL(SITE_URL),
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    authors: [{ name: 'Mr.Bedmed' }],
    icons: { icon: '/favicon.png' },
    verification: {
      ...(seo.google_verification ? { google: seo.google_verification } : {}),
      ...(seo.bing_verification ? { other: { 'msvalidate.01': seo.bing_verification } } : {}),
    },
    openGraph: {
      title: DEFAULT_TITLE,
      description: 'Your trusted partner for hospital beds and stretcher solutions. Sales, rentals, and expert service for healthcare facilities.',
      type: 'website',
      images: [{ url: '/favicon.png' }],
    },
    twitter: { card: 'summary_large_image', site: '@MrBedmed', images: ['/favicon.png'] },
  };
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const seo = await getSeoSettings();
  // Site-wide schema blocks (Dashboard → SEO & Tracking), pretty-printed so they are easy to find
  // in View Page Source (Ctrl+U). Invalid blocks are never output.
  const schemaBlocks = seo.schema_blocks
    .filter((b) => b.enabled)
    .map((b) => ({ id: b.id, html: schemaBlockHtml(b.json) }))
    .filter((b): b is { id: string; html: string } => !!b.html);

  return (
    <html lang="en">
      <head>
        {schemaBlocks.map((b) => (
          <script key={b.id} type="application/ld+json" data-schema={b.id} dangerouslySetInnerHTML={{ __html: b.html }} />
        ))}
      </head>
      <body>
        <Providers>{children}</Providers>
        <Analytics gaId={seo.ga_id} clarityId={seo.clarity_id} />
      </body>
    </html>
  );
}
