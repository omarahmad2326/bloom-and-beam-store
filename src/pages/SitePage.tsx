import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { SEOHead } from '@/components/seo/SEOHead';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { CustomJsonLd } from '@/components/seo/JsonLd';
import RichContent from '@/components/RichContent';
import { supabase } from '@/integrations/supabase/client';
import { absoluteUrl } from '@/lib/site';
import { toPlainText } from '@/lib/content';
import NotFound from './NotFound';

/** Admin-managed content page (legal pages etc.) served at /{slug}. */
export default function SitePage() {
  const { slug: rawSlug = '' } = useParams<{ slug: string }>();
  const slug = rawSlug.toLowerCase();

  const { data: page, isLoading } = useQuery({
    queryKey: ['site-page', slug],
    queryFn: async () => {
      // RLS returns drafts only to admins, which doubles as a preview.
      const { data, error } = await supabase.from('site_pages').select('*').eq('slug', slug).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="container flex justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  // Unknown page: NotFound also follows redirects (e.g. a renamed page slug).
  if (!page) return <NotFound />;

  const path = `/${page.slug}`;
  const updated = new Date(page.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <Layout>
      <SEOHead
        title={page.meta_title || `${page.title} | Mr.Bedmed`}
        description={page.meta_description || toPlainText(page.content_html, 160) || undefined}
        canonicalUrl={absoluteUrl(path)}
      />
      <BreadcrumbSchema items={[{ name: page.footer_label || page.title, path }]} />
      <CustomJsonLd value={page.custom_schema} />

      <article className="container max-w-3xl py-12 md:py-16">
        {!page.published && (
          <p className="mb-6 rounded-md bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800">
            Draft preview: this page is not published, so only admins can see it.
          </p>
        )}
        <h1 className="font-display text-3xl font-bold md:text-4xl">{page.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: {updated}</p>
        <RichContent content={page.content_html} className="mt-8" />
      </article>
    </Layout>
  );
}
