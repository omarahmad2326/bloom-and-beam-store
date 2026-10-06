import { useEffect } from 'react';
import { canonicalFor, setCanonicalLink } from '@/lib/site';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  article?: {
    author?: string;
    publishedTime?: string;
    modifiedTime?: string;
  };
}

export function SEOHead({
  title = 'Mr.Bedmed | Hospital Beds & Stretcher Solutions',
  description = 'Your trusted partner for hospital beds and stretcher solutions. Sales, rentals, and expert service for healthcare facilities.',
  keywords,
  canonicalUrl,
  ogImage,
  ogType = 'website',
  article
}: SEOHeadProps) {
  useEffect(() => {
    // Set title
    document.title = title;

    // Update or create meta tags
    const updateMeta = (name: string, content: string, property?: boolean) => {
      const attr = property ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    updateMeta('description', description);
    if (keywords) updateMeta('keywords', keywords);

    // Open Graph
    updateMeta('og:title', title, true);
    updateMeta('og:description', description, true);
    updateMeta('og:type', ogType, true);
    if (ogImage) updateMeta('og:image', ogImage, true);
    if (canonicalUrl) updateMeta('og:url', canonicalUrl, true);

    // Twitter Card
    updateMeta('twitter:card', 'summary_large_image');
    updateMeta('twitter:title', title);
    updateMeta('twitter:description', description);
    if (ogImage) updateMeta('twitter:image', ogImage);

    // Article specific
    if (article) {
      if (article.author) updateMeta('article:author', article.author, true);
      if (article.publishedTime) updateMeta('article:published_time', article.publishedTime, true);
      if (article.modifiedTime) updateMeta('article:modified_time', article.modifiedTime, true);
    }

    // Canonical URL: the page's own (slug) URL. Never removed: nginx puts it in the page
    // source, and every page must keep exactly one.
    setCanonicalLink(canonicalUrl || canonicalFor(window.location.pathname));

    return () => {
      // Cleanup is optional since we're updating in place
    };
  }, [title, description, keywords, canonicalUrl, ogImage, ogType, article]);

  return null;
}
