import { useEffect, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Calendar, Clock, User, ArrowLeft, Share2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SEOHead } from '@/components/seo/SEOHead';
import { JsonLd, CustomJsonLd } from '@/components/seo/JsonLd';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RedirectOrFallback } from '@/components/RedirectOrFallback';
import RichContent from '@/components/RichContent';
import { useContactInfo } from '@/hooks/useContactInfo';
import { blogPostingSchema } from '@/lib/schema';
import { absoluteUrl } from '@/lib/site';
import { toPlainText } from '@/lib/content';
import type { Tables } from '@/integrations/supabase/types';
import { resolveAlt } from '@/lib/imageAlt';
import { isValidSlug } from '@/lib/slugify';

type BlogPost = Tables<'blog_posts'>;

const BlogPostPage = () => {
  const { id } = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { contactInfo } = useContactInfo();

  useEffect(() => {
    const fetchPost = async () => {
      // Try to find by slug first, then by id
      let { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', id)
        .eq('published', true)
        .maybeSingle();

      if (!data) {
        const result = await supabase
          .from('blog_posts')
          .select('*')
          .eq('id', id)
          .eq('published', true)
          .maybeSingle();
        data = result.data;
        error = result.error;
      }

      if (error || !data) {
        setNotFound(true);
      } else {
        setPost(data);
        
        // Fetch related posts
        const { data: related } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('published', true)
          .neq('id', data.id)
          .limit(3);
        
        setRelatedPosts(related || []);
      }
      setLoading(false);
    };

    setLoading(true);
    setNotFound(false);
    fetchPost();
  }, [id]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  if (loading) {
    return (
      <Layout>
        <div className="container py-24 text-center">Loading...</div>
      </Layout>
    );
  }

  if (notFound || !post) {
    return <RedirectOrFallback fallback={<Navigate to="/blog" replace />} />;
  }

  // Opened by ID? Switch to the slug URL (the canonical one).
  if (post.slug && isValidSlug(post.slug) && id !== post.slug) return <Navigate to={`/blog/${post.slug}`} replace />;

  const path = `/blog/${post.slug || post.id}`;
  // Always the post's own slug URL, matching the canonical nginx puts in the page source.
  const canonicalUrl = absoluteUrl(path)!;
  const summary = post.excerpt || toPlainText(post.content, 160);
  const publishedAt = post.published_at || post.created_at;

  return (
    <Layout>
      <SEOHead
        title={post.meta_title || post.title}
        description={post.meta_description || summary}
        keywords={post.meta_keywords || undefined}
        canonicalUrl={canonicalUrl}
        ogImage={absoluteUrl(post.image_url)}
        ogType="article"
        article={{
          author: post.author,
          publishedTime: publishedAt,
          modifiedTime: post.updated_at
        }}
      />
      <JsonLd
        id="article"
        data={blogPostingSchema({
          title: post.title,
          path,
          description: summary,
          image: post.image_url,
          author: post.author,
          publishedAt,
          modifiedAt: post.updated_at,
          logoUrl: contactInfo.logo_url,
        })}
      />
      <BreadcrumbSchema items={[{ name: 'Blog', path: '/blog' }, { name: post.title, path }]} />
      <CustomJsonLd value={post.custom_schema} />

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-background" />
        <div className="container mx-auto px-4 py-12 relative">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>
          
          <div className="max-w-4xl">
            <Badge variant="secondary" className="mb-4">
              {post.category}
            </Badge>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-6 text-muted-foreground">
              <span className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {post.author}
              </span>
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(publishedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {post.read_time || '5 min read'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Image */}
      {post.image_url && (
        <section className="container mx-auto px-4 -mt-4">
          <div className="max-w-4xl mx-auto">
            <img
              src={post.image_url}
              alt={resolveAlt(post.image_alt, post.title)}
              title={post.title}
              loading="lazy"
              className="w-full aspect-video object-cover rounded-2xl shadow-xl"
            />
          </div>
        </section>
      )}

      {/* Content */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <article className="max-w-none text-lg">
              <RichContent content={post.content} />
            </article>

            {/* Share */}
            <div className="flex items-center justify-between border-t border-border pt-8 mt-12">
              <div className="text-muted-foreground">
                Written by <span className="font-semibold text-foreground">{post.author}</span>
              </div>
              <Button variant="outline" onClick={handleShare} className="gap-2">
                <Share2 className="w-4 h-4" />
                Share Article
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-foreground mb-8">Related Articles</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost) => (
                <Link
                  key={relatedPost.id}
                  to={`/blog/${relatedPost.slug || relatedPost.id}`}
                  className="group bg-card rounded-xl overflow-hidden border border-border shadow-md hover:shadow-lg transition-all"
                >
                  <div className="aspect-video overflow-hidden">
                    {relatedPost.image_url ? (
                      <img
                        src={relatedPost.image_url}
                        alt={resolveAlt(relatedPost.image_alt, relatedPost.title)}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted" />
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {relatedPost.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      {relatedPost.read_time || '5 min read'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
};

export default BlogPostPage;
