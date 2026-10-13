import { SITE_URL } from '@/lib/site';
import { getSeoSettings } from '@/lib/server/seo';
import { robotsTxt } from '@/lib/seoSettings';

export const dynamic = 'force-dynamic';

/** /robots.txt from Dashboard → SEO & Tracking (recommended rules or the admin's own text). */
export async function GET() {
  const seo = await getSeoSettings();
  return new Response(robotsTxt(seo, SITE_URL), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
}
