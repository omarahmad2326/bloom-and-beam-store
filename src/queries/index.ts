/**
 * Shared React Query definitions: one key + fetch function per piece of data.
 *
 * Used by the components (useQuery) AND by the Next.js server routes (prefetchQuery), so the
 * server renders each page with its data already in the HTML and the browser picks up the same
 * cache without fetching again.
 */
import { queryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { defaultContactInfo, type ContactInfo } from '@/lib/contactInfo';
import { FOOTER_SETTINGS_KEY, withFooterDefaults } from '@/lib/footer';
import { ABOUT_SETTINGS_KEY, withAboutDefaults } from '@/lib/aboutPage';
import { CONTACT_SETTINGS_KEY, withContactDefaults } from '@/lib/contactPage';

type Product = Tables<'products'>;
type Category = Tables<'categories'>;

const MINUTE = 60_000;

async function siteSettingValue(key: string): Promise<unknown> {
  const { data, error } = await supabase.from('site_settings').select('value').eq('key', key).maybeSingle();
  if (error) throw error;
  return data?.value ?? null;
}

/** Quote a value for a PostgREST or() filter. */
const pgQuote = (value: string) => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

export const queries = {
  // ---------------------------------------------------------------- site-wide
  contactInfo: () =>
    queryOptions({
      queryKey: ['site-setting', 'contact_info'],
      staleTime: 5 * MINUTE,
      queryFn: async (): Promise<ContactInfo> => ({
        ...defaultContactInfo,
        ...((await siteSettingValue('contact_info')) as Partial<ContactInfo> | null),
      }),
    }),

  footer: () =>
    queryOptions({
      queryKey: ['site-setting', FOOTER_SETTINGS_KEY],
      staleTime: 5 * MINUTE,
      queryFn: async () => withFooterDefaults(await siteSettingValue(FOOTER_SETTINGS_KEY)),
    }),

  footerPages: () =>
    queryOptions({
      queryKey: ['footer-pages'],
      staleTime: 5 * MINUTE,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('site_pages')
          .select('slug, title, footer_label')
          .eq('published', true)
          .eq('show_in_footer', true)
          .order('footer_order', { ascending: true })
          .order('title', { ascending: true });
        if (error) throw error;
        return data || [];
      },
    }),

  /** Home "service cards" with their items: drives the header menu and the home page cards. */
  homeMenu: () =>
    queryOptions({
      queryKey: ['home-menu'],
      staleTime: 5 * MINUTE,
      queryFn: async () => {
        const [cards, items] = await Promise.all([
          supabase.from('home_service_cards').select('*').order('sort_order', { ascending: true }),
          supabase.from('home_service_card_items').select('*').order('sort_order', { ascending: true }),
        ]);
        if (cards.error) throw cards.error;
        if (items.error) throw items.error;
        return (cards.data || []).map((card) => ({
          ...card,
          items: (items.data || []).filter((item) => item.card_id === card.id),
        }));
      },
    }),

  heroSettings: () =>
    queryOptions({
      queryKey: ['site-setting', 'hero'],
      staleTime: 5 * MINUTE,
      queryFn: () => siteSettingValue('hero'),
    }),

  aboutPage: () =>
    queryOptions({
      queryKey: ['site-setting', ABOUT_SETTINGS_KEY],
      queryFn: async () => withAboutDefaults(await siteSettingValue(ABOUT_SETTINGS_KEY)),
    }),

  contactPage: () =>
    queryOptions({
      queryKey: ['site-setting', CONTACT_SETTINGS_KEY],
      queryFn: async () => withContactDefaults(await siteSettingValue(CONTACT_SETTINGS_KEY)),
    }),

  // ---------------------------------------------------------------- products & categories
  featuredProducts: () =>
    queryOptions({
      queryKey: ['featuredProducts'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('in_stock', true)
          .order('created_at', { ascending: false })
          .limit(4);
        if (error) throw error;
        return data as Product[];
      },
    }),

  allProducts: () =>
    queryOptions({
      queryKey: ['products', 'all'],
      queryFn: async () => {
        const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data as Product[];
      },
    }),

  allCategories: () =>
    queryOptions({
      queryKey: ['categories', 'all'],
      staleTime: 5 * MINUTE,
      queryFn: async () => {
        const { data, error } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
        if (error) throw error;
        return data as Category[];
      },
    }),

  /** Product by slug, falling back to its id. */
  product: (idOrSlug: string) =>
    queryOptions({
      queryKey: ['product', idOrSlug],
      queryFn: async () => {
        const { data: bySlug, error: slugError } = await supabase.from('products').select('*').eq('slug', idOrSlug).maybeSingle();
        if (slugError) throw slugError;
        if (bySlug) return bySlug as Product;
        if (!/^[0-9a-f-]{36}$/i.test(idOrSlug)) return null;
        const { data: byId, error } = await supabase.from('products').select('*').eq('id', idOrSlug).maybeSingle();
        if (error) throw error;
        return (byId as Product | null) ?? null;
      },
    }),

  relatedProducts: (category: string, excludeId: string) =>
    queryOptions({
      queryKey: ['relatedProducts', category, excludeId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, image_url, image_alt, price, category, slug')
          .eq('category', category)
          .neq('id', excludeId)
          .limit(4);
        if (error) throw error;
        return data;
      },
    }),

  /** Category by slug (case-insensitive), or via a home-menu item that points at it by name. */
  category: (slug: string) =>
    queryOptions({
      queryKey: ['category', slug],
      queryFn: async (): Promise<Category | null> => {
        const { data, error } = await supabase.from('categories').select('*').ilike('slug', slug).limit(1).maybeSingle();
        if (error) throw error;
        if (data) return data;
        const { data: item } = await supabase.from('home_service_card_items').select('name').ilike('slug', slug).limit(1).maybeSingle();
        if (!item) return null;
        const { data: byName } = await supabase.from('categories').select('*').ilike('name', item.name).limit(1).maybeSingle();
        return byName ?? null;
      },
    }),

  categoryProducts: (category: Pick<Category, 'id' | 'name'>) =>
    queryOptions({
      queryKey: ['category-products', category.id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .or(`category_id.eq.${category.id},category.ilike.${pgQuote(category.name)}`)
          .order('in_stock', { ascending: false })
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data as Product[];
      },
    }),

  // ---------------------------------------------------------------- services
  services: () =>
    queryOptions({
      queryKey: ['services', 'published'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('services')
          .select('id, slug, icon, title, short_desc, sort_order')
          .eq('published', true)
          .order('sort_order', { ascending: true });
        if (error) throw error;
        return data;
      },
    }),

  service: (slug: string) =>
    queryOptions({
      queryKey: ['service', slug],
      queryFn: async () => {
        const { data, error } = await supabase.from('services').select('*').eq('slug', slug).eq('published', true).maybeSingle();
        if (error) throw error;
        return data;
      },
    }),

  // ---------------------------------------------------------------- parts
  parts: () =>
    queryOptions({
      queryKey: ['parts', 'all'],
      queryFn: async () => {
        const { data, error } = await supabase.from('parts').select('*').order('sort_order', { ascending: true });
        if (error) throw error;
        return data;
      },
    }),

  /** Part by slug, falling back to its id. */
  part: (idOrSlug: string) =>
    queryOptions({
      queryKey: ['part', idOrSlug],
      queryFn: async () => {
        const { data: bySlug, error: slugError } = await supabase.from('parts').select('*').eq('slug', idOrSlug).maybeSingle();
        if (slugError) throw slugError;
        if (bySlug) return bySlug;
        if (!/^[0-9a-f-]{36}$/i.test(idOrSlug)) return null;
        const { data, error } = await supabase.from('parts').select('*').eq('id', idOrSlug).maybeSingle();
        if (error) throw error;
        return data ?? null;
      },
    }),

  // ---------------------------------------------------------------- FAQ & blog
  faqs: () =>
    queryOptions({
      queryKey: ['faqs', 'published'],
      queryFn: async () => {
        const { data, error } = await supabase.from('faqs').select('*').eq('published', true).order('sort_order', { ascending: true });
        if (error) throw error;
        return data;
      },
    }),

  blogPosts: () =>
    queryOptions({
      queryKey: ['blog-posts', 'published'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('published', true)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
      },
    }),

  /** Published post by slug, falling back to its id. */
  blogPost: (idOrSlug: string) =>
    queryOptions({
      queryKey: ['blog-post', idOrSlug],
      queryFn: async () => {
        const { data: bySlug, error: slugError } = await supabase
          .from('blog_posts').select('*').eq('slug', idOrSlug).eq('published', true).maybeSingle();
        if (slugError) throw slugError;
        if (bySlug) return bySlug;
        if (!/^[0-9a-f-]{36}$/i.test(idOrSlug)) return null;
        const { data, error } = await supabase.from('blog_posts').select('*').eq('id', idOrSlug).eq('published', true).maybeSingle();
        if (error) throw error;
        return data ?? null;
      },
    }),

  relatedPosts: (postId: string) =>
    queryOptions({
      queryKey: ['related-posts', postId],
      queryFn: async () => {
        const { data, error } = await supabase.from('blog_posts').select('*').eq('published', true).neq('id', postId).limit(3);
        if (error) throw error;
        return data || [];
      },
    }),

  // ---------------------------------------------------------------- content pages & redirects
  sitePage: (slug: string) =>
    queryOptions({
      queryKey: ['site-page', slug],
      queryFn: async () => {
        // RLS returns drafts only to admins, which doubles as a preview.
        const { data, error } = await supabase.from('site_pages').select('*').eq('slug', slug).maybeSingle();
        if (error) throw error;
        return data;
      },
    }),

  /** Redirect for a path (exact, then lowercase), from Dashboard → Redirects. */
  redirect: (keys: string[]) =>
    queryOptions({
      queryKey: ['redirect', keys[0]],
      staleTime: 5 * MINUTE,
      queryFn: async () => {
        const { data, error } = await supabase.from('redirects').select('from_path, to_path, status_code').in('from_path', keys);
        if (error) return null;
        return data?.find((r) => r.from_path === keys[0]) ?? data?.[0] ?? null;
      },
    }),
};
