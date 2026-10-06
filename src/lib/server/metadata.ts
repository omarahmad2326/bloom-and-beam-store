import type { Metadata } from 'next';
import type { Tables } from '@/integrations/supabase/types';
import { absoluteUrl } from '@/lib/site';
import { toPlainText } from '@/lib/content';
import type { AboutPageContent } from '@/lib/aboutPage';
import type { ContactPageContent } from '@/lib/contactPage';

/**
 * Server-side <head> tags (title, description, canonical, Open Graph, Twitter) for every public
 * page. Same fallbacks the pages used before: dashboard meta fields first, then sensible defaults.
 */

interface PageMeta {
  title: string;
  description?: string | null;
  path: string;
  image?: string | null;
  type?: 'website' | 'article';
  keywords?: string | null;
  article?: { publishedTime?: string; modifiedTime?: string; author?: string };
}

export function pageMetadata({ title, description, path, image, type = 'website', keywords, article }: PageMeta): Metadata {
  const url = absoluteUrl(path)!;
  const desc = description?.trim() || undefined;
  const images = image ? [{ url: absoluteUrl(image)! }] : undefined;
  return {
    title: { absolute: title },
    description: desc,
    keywords: keywords || undefined,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: desc,
      url,
      type,
      images,
      ...(type === 'article' && article
        ? { publishedTime: article.publishedTime, modifiedTime: article.modifiedTime, authors: article.author ? [article.author] : undefined }
        : {}),
    },
    twitter: { card: 'summary_large_image', title, description: desc, images: images?.map((i) => i.url) },
  };
}

export const notFoundMetadata: Metadata = { title: { absolute: 'Page not found | Mr.Bedmed' }, robots: { index: false } };

export function productMetadata(p: Tables<'products'>): Metadata {
  return pageMetadata({
    title: p.meta_title || `${p.name} | Mr.Bedmed`,
    description: p.meta_description || p.short_description || toPlainText(p.description, 160),
    path: `/products/${p.slug || p.id}`,
    image: p.image_url || p.image_urls?.[0],
  });
}

export function partMetadata(p: Tables<'parts'>): Metadata {
  return pageMetadata({
    title: p.meta_title || `${p.name} | Mr.Bedmed Parts`,
    description: p.meta_description || p.short_description || toPlainText(p.description, 160) || `${p.name} - OEM replacement part from Mr.Bedmed`,
    path: `/part/${p.slug || p.id}`,
    image: p.image_urls?.[0],
  });
}

export function serviceMetadata(s: Tables<'services'>): Metadata {
  return pageMetadata({
    title: s.meta_title || `${s.title} | Mr.Bedmed Services`,
    description: s.meta_description || s.short_desc,
    path: `/services/${s.slug}`,
    image: s.image_url,
  });
}

export function blogPostMetadata(b: Tables<'blog_posts'>): Metadata {
  return pageMetadata({
    title: b.meta_title || b.title,
    description: b.meta_description || b.excerpt || toPlainText(b.content, 160),
    path: `/blog/${b.slug || b.id}`,
    image: b.image_url,
    type: 'article',
    keywords: b.meta_keywords,
    article: { publishedTime: b.published_at || b.created_at, modifiedTime: b.updated_at, author: b.author },
  });
}

export function categoryMetadata(c: Tables<'categories'>): Metadata {
  return pageMetadata({
    title: c.meta_title || `${c.name} | Mr.Bedmed Hospital Beds & Stretcher Solutions`,
    description: c.meta_description || toPlainText(c.intro_html, 160) || c.description,
    path: `/category/${c.slug.toLowerCase()}`,
    image: c.image_url,
  });
}

export function sitePageMetadata(p: Tables<'site_pages'>): Metadata {
  return pageMetadata({
    title: p.meta_title || `${p.title} | Mr.Bedmed`,
    description: p.meta_description || toPlainText(p.content_html, 160),
    path: `/${p.slug}`,
  });
}

export const aboutMetadata = (c: AboutPageContent) => pageMetadata({ title: c.meta_title, description: c.meta_description, path: '/about-us' });
export const contactMetadata = (c: ContactPageContent) => pageMetadata({ title: c.meta_title, description: c.meta_description, path: '/contact-us' });
