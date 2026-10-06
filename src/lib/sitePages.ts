/** Top-level paths used by the app; a content page can't take these slugs (mirrors the DB constraint). */
export const RESERVED_PAGE_SLUGS = [
  'admin', 'api', 'assets', 'images', 'auth', 'account', 'cart', 'checkout', 'orders',
  'products', 'product', 'category', 'gallery', 'services', 'parts', 'part', 'blog',
  'faq', 'about-us', 'contact-us', 'sitemap', 'sitemap-xml', 'robots', 'favicon',
];

export const RESERVED_SLUG_MESSAGE = 'This URL is used by another part of the site. Choose a different slug.';

export function isReservedPageSlug(slug: string): boolean {
  return RESERVED_PAGE_SLUGS.includes(slug);
}
