/**
 * Sitemap rules (pure, so they can be tested). /sitemap.xml (src/app/sitemap.ts) feeds it fresh
 * database rows on every request, so publishing, editing or deleting content updates it at once.
 *
 * Lists: main pages, published site pages, categories, published services, products, parts and
 * published blog posts, each under its slug URL on https://mrbedmed.com with lastmod = last update.
 * Leaves out: ID URLs (items without a valid slug), URLs that redirect, and noindex pages
 * (cart, checkout, orders, auth, account, admin are never listed).
 */
import type { MetadataRoute } from 'next';

export type SitemapRow = { slug?: string | null; updated_at?: string | null };
type Freq = MetadataRoute.Sitemap[number]['changeFrequency'];

export interface SitemapData {
  products: SitemapRow[];
  parts: SitemapRow[];
  services: SitemapRow[];
  categories: SitemapRow[];
  posts: SitemapRow[];
  pages: SitemapRow[];
  faqs: SitemapRow[];
  /** updated_at of the about_page / contact_page settings rows. */
  aboutUpdatedAt?: string | null;
  contactUpdatedAt?: string | null;
  /** from_path of every redirect: these URLs are never listed. */
  redirectedPaths: string[];
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Latest updated_at of the rows (undefined when none has a date). */
export function latest(...groups: (SitemapRow | string | null | undefined)[][]): Date | undefined {
  let max = 0;
  for (const group of groups) {
    for (const item of group) {
      const value = typeof item === 'string' ? item : item?.updated_at;
      const time = value ? Date.parse(value) : NaN;
      if (time > max) max = time;
    }
  }
  return max ? new Date(max) : undefined;
}

export function buildSitemap(siteUrl: string, data: SitemapData): MetadataRoute.Sitemap {
  const origin = siteUrl.replace(/\/+$/, '');
  // Case-sensitive: /category/Chair-stretcher → /category/chair-stretcher must not drop the live URL.
  const redirected = new Set(data.redirectedPaths.map((p) => p.replace(/\/+$/, '')));
  const seen = new Set<string>();
  const out: MetadataRoute.Sitemap = [];

  const add = (path: string, changeFrequency: Freq, priority: number, lastModified?: Date) => {
    const key = path.toLowerCase();
    if (seen.has(key) || redirected.has(path)) return;
    seen.add(key);
    out.push({ url: `${origin}${path}`, lastModified, changeFrequency, priority });
  };
  const items = (rows: SitemapRow[], prefix: string, changeFrequency: Freq, priority: number, lowercase = false) => {
    for (const row of rows) {
      const slug = lowercase ? row.slug?.toLowerCase() : row.slug;
      if (!slug || !SLUG.test(slug)) continue; // never an ID URL
      add(`${prefix}${slug}`, changeFrequency, priority, latest([row]));
    }
  };

  const { products, parts, services, categories, posts, pages, faqs } = data;
  add('/', 'weekly', 1.0, latest(products, parts, services, categories, posts));
  add('/products', 'daily', 0.9, latest(products));
  add('/parts', 'weekly', 0.8, latest(parts));
  add('/services', 'monthly', 0.7, latest(services));
  add('/blog', 'daily', 0.8, latest(posts));
  add('/faq', 'weekly', 0.7, latest(faqs));
  add('/about-us', 'monthly', 0.6, latest([data.aboutUpdatedAt]));
  add('/contact-us', 'monthly', 0.6, latest([data.contactUpdatedAt]));
  items(categories, '/category/', 'weekly', 0.8, true);
  items(services, '/services/', 'monthly', 0.7);
  items(products, '/products/', 'weekly', 0.8);
  items(parts, '/part/', 'weekly', 0.7);
  items(posts, '/blog/', 'monthly', 0.7);
  items(pages, '/', 'yearly', 0.4);
  return out;
}
