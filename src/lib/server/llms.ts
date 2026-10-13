/** Recommended llms.txt for Dashboard → SEO & Tracking (server only). */
import { SITE_URL } from '@/lib/site';
import { buildLlmsTxt } from '@/lib/seoSettings';
import { supabase } from '@/integrations/supabase/client';
import { defaultContactInfo, type ContactInfo } from '@/lib/contactInfo';

/** Recommended llms.txt, built from Contact Info, services, categories and the latest posts. */
export async function recommendedLlmsTxt(): Promise<string> {
  const [contact, services, categories, posts] = await Promise.all([
    supabase.from('site_settings').select('value').eq('key', 'contact_info').maybeSingle(),
    supabase.from('services').select('title, slug, short_desc, sort_order').eq('published', true).order('sort_order', { ascending: true }),
    supabase.from('categories').select('name, slug').order('name', { ascending: true }),
    supabase
      .from('blog_posts')
      .select('title, slug, excerpt, published_at')
      .eq('published', true)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(10),
  ]);
  const c = { ...defaultContactInfo, ...((contact.data?.value as Partial<ContactInfo> | null) ?? {}) };
  return buildLlmsTxt({
    siteUrl: SITE_URL,
    name: 'Mr.Bedmed',
    description:
      'Mr.Bedmed sells, rents and services new and refurbished hospital beds, stretchers, patient recliners and parts for hospitals, clinics, EMS and care facilities across Texas, with biomedical repair and preventive maintenance.',
    contact: {
      phone: c.phone,
      email: c.email,
      address: [c.address_line1, c.address_line2].filter(Boolean).join(', '),
    },
    services: (services.data || []).map((s) => ({ title: s.title, slug: s.slug, summary: s.short_desc })),
    categories: (categories.data || []).map((x) => ({ name: x.name, slug: x.slug.toLowerCase() })),
    posts: (posts.data || []).filter((p) => p.slug).map((p) => ({ title: p.title, slug: p.slug as string, excerpt: p.excerpt })),
  });
}
