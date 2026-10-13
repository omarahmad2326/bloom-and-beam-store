import { getSeoSettings } from '@/lib/server/seo';
import { recommendedLlmsTxt } from '@/lib/server/llms';

export const dynamic = 'force-dynamic';

/**
 * /llms.txt (llmstxt.org) from Dashboard → SEO & Tracking. ?view=recommended always shows the
 * automatic version (used by the dashboard to start a custom text from it).
 */
export async function GET(req: Request) {
  const seo = await getSeoSettings();
  const recommended = new URL(req.url).searchParams.get('view') === 'recommended';
  const custom = !recommended && seo.llms_mode === 'custom' ? seo.llms_custom.trim() : '';
  const body = custom ? `${custom}\n` : await recommendedLlmsTxt();
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': recommended ? 'no-store' : 'public, max-age=300' },
  });
}
