import type { MetadataRoute } from 'next';
import { supabase } from '@/integrations/supabase/client';
import { SITE_URL } from '@/lib/site';
import { buildSitemap, latest } from '@/lib/sitemap';
import { ABOUT_SETTINGS_KEY } from '@/lib/aboutPage';
import { CONTACT_SETTINGS_KEY } from '@/lib/contactPage';

// Always current: generated from the database on every request (Cloudflare does not cache it).
export const dynamic = 'force-dynamic';

/** /sitemap.xml: rules in src/lib/sitemap.ts. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, products, parts, services, categories, pages, faqs, settings, redirects] = await Promise.all([
    supabase.from('blog_posts').select('slug, updated_at').eq('published', true),
    supabase.from('products').select('slug, updated_at'),
    supabase.from('parts').select('slug, updated_at'),
    supabase.from('services').select('slug, updated_at').eq('published', true),
    supabase.from('categories').select('slug, updated_at'),
    supabase.from('site_pages').select('slug, updated_at').eq('published', true),
    supabase.from('faqs').select('updated_at').eq('published', true),
    supabase.from('site_settings').select('key, updated_at').in('key', [ABOUT_SETTINGS_KEY, CONTACT_SETTINGS_KEY, 'contact_info']),
    supabase.from('redirects').select('from_path'),
  ]);

  // A failed read must not publish a sitemap with whole sections missing; a 500 makes Google retry later.
  const failed = [posts, products, parts, services, categories, pages, faqs, settings, redirects].find((r) => r.error);
  if (failed) throw failed.error;

  const settingDate = (key: string) => settings.data?.find((s) => s.key === key)?.updated_at;
  return buildSitemap(SITE_URL, {
    posts: posts.data ?? [],
    products: products.data ?? [],
    parts: parts.data ?? [],
    services: services.data ?? [],
    categories: categories.data ?? [],
    pages: pages.data ?? [],
    faqs: faqs.data ?? [],
    aboutUpdatedAt: settingDate(ABOUT_SETTINGS_KEY),
    // The Contact page also shows Dashboard → Contact Info.
    contactUpdatedAt: latest([settingDate(CONTACT_SETTINGS_KEY), settingDate('contact_info')])?.toISOString(),
    redirectedPaths: (redirects.data ?? []).map((r) => r.from_path),
  });
}
