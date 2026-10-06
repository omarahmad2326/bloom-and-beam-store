import type { MetadataRoute } from 'next';
import { supabase } from '@/integrations/supabase/client';
import { SITE_URL } from '@/lib/site';

// Always current: generated from the database when requested.
export const dynamic = 'force-dynamic';

/** /sitemap.xml generated from the database on each request (same URLs the site serves). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, products, parts, services, categories, pages] = await Promise.all([
    supabase.from('blog_posts').select('slug, id, updated_at').eq('published', true),
    supabase.from('products').select('id, slug, updated_at'),
    supabase.from('parts').select('id, slug, updated_at'),
    supabase.from('services').select('slug, updated_at').eq('published', true),
    supabase.from('categories').select('slug, updated_at'),
    supabase.from('site_pages').select('slug, updated_at').eq('published', true),
  ]);

  type Freq = MetadataRoute.Sitemap[number]['changeFrequency'];
  const entry = (path: string, changeFrequency: Freq, priority: number, updatedAt?: string | null) => ({
    url: `${SITE_URL}${path}`,
    lastModified: updatedAt ? new Date(updatedAt) : undefined,
    changeFrequency,
    priority,
  });

  return [
    entry('/', 'weekly', 1.0),
    entry('/products', 'daily', 0.9),
    entry('/parts', 'weekly', 0.8),
    entry('/services', 'monthly', 0.7),
    entry('/about-us', 'monthly', 0.6),
    entry('/contact-us', 'monthly', 0.6),
    entry('/faq', 'weekly', 0.7),
    entry('/blog', 'daily', 0.8),
    ...(pages.data ?? []).map((p) => entry(`/${p.slug}`, 'yearly', 0.4, p.updated_at)),
    ...(categories.data ?? []).map((c) => entry(`/category/${c.slug.toLowerCase()}`, 'weekly', 0.8, c.updated_at)),
    ...(services.data ?? []).map((s) => entry(`/services/${s.slug}`, 'monthly', 0.7, s.updated_at)),
    ...(products.data ?? []).map((p) => entry(`/products/${p.slug || p.id}`, 'weekly', 0.8, p.updated_at)),
    ...(parts.data ?? []).map((p) => entry(`/part/${p.slug || p.id}`, 'weekly', 0.7, p.updated_at)),
    ...(posts.data ?? []).map((p) => entry(`/blog/${p.slug || p.id}`, 'monthly', 0.7, p.updated_at)),
  ];
}
