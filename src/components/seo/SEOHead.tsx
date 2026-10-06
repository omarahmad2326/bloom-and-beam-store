/**
 * Kept for compatibility with existing page components. Page <head> tags (title, description,
 * canonical, Open Graph, Twitter) are now produced on the server by each route's
 * generateMetadata (src/lib/server/metadata.ts), so they are in the HTML source.
 */
export interface SEOHeadProps {
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

export function SEOHead(_props: SEOHeadProps) {
  return null;
}
