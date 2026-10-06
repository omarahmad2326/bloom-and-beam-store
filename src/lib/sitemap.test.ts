import { describe, expect, it } from 'vitest';
import { buildSitemap, type SitemapData } from './sitemap';

const data = (over: Partial<SitemapData> = {}): SitemapData => ({
  products: [
    { slug: 'stryker-1007-stretcher', updated_at: '2026-10-05T10:00:00Z' },
    { slug: null, updated_at: '2026-10-01T10:00:00Z' }, // no slug: would be an ID URL
  ],
  parts: [{ slug: 'bed-motor', updated_at: '2026-09-01T10:00:00Z' }],
  services: [{ slug: 'equipment-rental', updated_at: '2026-10-06T10:00:00Z' }],
  categories: [
    { slug: 'icu-beds', updated_at: '2026-10-02T10:00:00Z' },
    { slug: 'Chair-Stretcher', updated_at: '2026-10-02T10:00:00Z' },
  ],
  posts: [{ slug: 'how-to-choose', updated_at: '2026-10-07T10:00:00Z' }],
  pages: [{ slug: 'privacy', updated_at: '2026-10-03T10:00:00Z' }],
  faqs: [{ updated_at: '2026-08-01T10:00:00Z' }],
  aboutUpdatedAt: '2026-10-06T19:21:10Z',
  contactUpdatedAt: null,
  redirectedPaths: ['/category/icu-bed', '/products/old-name'],
  ...over,
});

const urls = (d: SitemapData) => buildSitemap('https://mrbedmed.com', d).map((e) => e.url);

describe('sitemap', () => {
  it('lists main pages, categories, services, products, parts, posts and site pages', () => {
    expect(urls(data())).toEqual([
      'https://mrbedmed.com/',
      'https://mrbedmed.com/products',
      'https://mrbedmed.com/parts',
      'https://mrbedmed.com/services',
      'https://mrbedmed.com/blog',
      'https://mrbedmed.com/faq',
      'https://mrbedmed.com/about-us',
      'https://mrbedmed.com/contact-us',
      'https://mrbedmed.com/category/icu-beds',
      'https://mrbedmed.com/category/chair-stretcher',
      'https://mrbedmed.com/services/equipment-rental',
      'https://mrbedmed.com/products/stryker-1007-stretcher',
      'https://mrbedmed.com/part/bed-motor',
      'https://mrbedmed.com/blog/how-to-choose',
      'https://mrbedmed.com/privacy',
    ]);
  });

  it('never lists ID URLs, redirected URLs or account/admin pages', () => {
    const list = urls(data({ products: [{ slug: 'old-name' }, { slug: '059b8ada-b15f-4c96-a573-bbee764b6b3c'.toUpperCase() }] }));
    expect(list.some((u) => /\/(cart|checkout|orders|auth|account|admin)\b/.test(u))).toBe(false);
    expect(list).not.toContain('https://mrbedmed.com/products/old-name');
    expect(list.some((u) => /[0-9A-F]{8}-[0-9A-F]{4}/.test(u))).toBe(false);
  });

  it('uses https://mrbedmed.com only and lastmod = last update', () => {
    const entries = buildSitemap('https://mrbedmed.com/', data());
    expect(entries.every((e) => e.url.startsWith('https://mrbedmed.com/'))).toBe(true);
    const at = (path: string) => entries.find((e) => e.url === `https://mrbedmed.com${path}`)?.lastModified;
    expect(at('/products/stryker-1007-stretcher')).toEqual(new Date('2026-10-05T10:00:00Z'));
    expect(at('/')).toEqual(new Date('2026-10-07T10:00:00Z')); // newest content anywhere
    expect(at('/products')).toEqual(new Date('2026-10-05T10:00:00Z'));
    expect(at('/about-us')).toEqual(new Date('2026-10-06T19:21:10Z'));
    expect(at('/contact-us')).toBeUndefined(); // no date known: omitted rather than invented
  });

  it('keeps the live URL when a redirect only fixes its letter case', () => {
    const list = urls(data({ redirectedPaths: ['/category/Chair-stretcher'] }));
    expect(list).toContain('https://mrbedmed.com/category/chair-stretcher');
  });

  it('lists each URL once', () => {
    const list = urls(data({ categories: [{ slug: 'icu-beds' }, { slug: 'ICU-beds' }] }));
    expect(list.filter((u) => u.endsWith('/category/icu-beds'))).toHaveLength(1);
  });
});
