/** Recently Deleted (Dashboard): retention and how deleted rows are described. */

export const RETENTION_DAYS = 7;

/** What each table is called in the dashboard, and where its items are managed. */
export const DELETED_TYPES: Record<string, { label: string; path: string }> = {
  products: { label: 'Product', path: '/admin/products' },
  parts: { label: 'Part', path: '/admin/parts' },
  services: { label: 'Service', path: '/admin/services' },
  categories: { label: 'Category', path: '/admin/categories' },
  blog_posts: { label: 'Blog post', path: '/admin/blog' },
  faqs: { label: 'FAQ', path: '/admin/faqs' },
  site_pages: { label: 'Page', path: '/admin/pages' },
  home_service_cards: { label: 'Home card', path: '/admin/home-cards' },
  home_service_card_items: { label: 'Menu item', path: '/admin/home-cards' },
  redirects: { label: 'Redirect', path: '/admin/redirects' },
  orders: { label: 'Order', path: '/admin/orders' },
  contact_messages: { label: 'Message', path: '/admin/messages' },
  newsletter_subscribers: { label: 'Subscriber', path: '/admin/newsletter' },
  newsletter_campaigns: { label: 'Newsletter', path: '/admin/newsletter' },
};

/** "6 days left", "23 hours left", "under 1 hour left". */
export function timeLeft(deletedAt: string, now = Date.now()): string {
  const ms = new Date(deletedAt).getTime() + RETENTION_DAYS * 86_400_000 - now;
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} left`;
  }
  if (hours >= 1) return `${hours} hour${hours === 1 ? '' : 's'} left`;
  return 'under 1 hour left';
}
