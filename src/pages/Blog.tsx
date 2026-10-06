import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Link } from 'react-router-dom';
import { Calendar, Clock, User, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { SEOHead } from '@/components/seo/SEOHead';
import { toPlainText } from '@/lib/content';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { resolveAlt } from '@/lib/imageAlt';
import { absoluteUrl } from '@/lib/site';

interface BlogPost {
  id: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  content: string;
  image_url: string | null;
  image_alt?: string | null;
  category: string;
  author: string;
  read_time: string | null;
  created_at: string;
  published: boolean;
}

const Blog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPosts(data);
      }
      setLoading(false);
    };

    fetchPosts();
  }, []);

  const featuredPost = posts[0];
  const otherPosts = posts.slice(1);

  if (loading) {
    return (
      <Layout>
        <BreadcrumbSchema items={[{ name: 'Blog', path: '/blog' }]} />
        <div className="container py-24 text-center">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <BreadcrumbSchema items={[{ name: 'Blog', path: '/blog' }]} />
      <SEOHead
        title="Mr.Bedmed Blog - Medical Equipment Insights"
        description="Expert insights, maintenance tips, and industry news for healthcare professionals"
        canonicalUrl={absoluteUrl('/blog')}
      />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/5 via-background to-accent/5 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Mr.Bedmed <span className="text-primary">Blog</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Expert insights, maintenance tips, and industry news for healthcare professionals
            </p>
          </div>
        </div>
      </section>

      {posts.length === 0 ? (
        <section className="py-12">
          <div className="container mx-auto px-4 text-center">
            <p className="text-muted-foreground">No blog posts published yet.</p>
          </div>
        </section>
      ) : (
        <>
          {/* Featured Post */}
          {featuredPost && (
            <section className="py-12">
              <div className="container mx-auto px-4">
                <h2 className="text-2xl font-bold text-foreground mb-8">Featured Article</h2>
                <Link to={`/blog/${featuredPost.slug || featuredPost.id}`} className="group block">
                  <div className="grid md:grid-cols-2 gap-8 bg-card rounded-2xl overflow-hidden border border-border shadow-lg hover:shadow-xl transition-shadow">
                    <div className="aspect-video md:aspect-auto overflow-hidden">
                      {featuredPost.image_url ? (
                        <img
                          src={featuredPost.image_url}
                          alt={resolveAlt(featuredPost.image_alt, featuredPost.title)}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <span className="text-muted-foreground">No image</span>
                        </div>
                      )}
                    </div>
                    <div className="p-8 flex flex-col justify-center">
                      <Badge variant="secondary" className="w-fit mb-4">
                        {featuredPost.category}
                      </Badge>
                      <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4 group-hover:text-primary transition-colors">
                        {featuredPost.title}
                      </h3>
                      <p className="text-muted-foreground mb-6 line-clamp-3">
                        {featuredPost.excerpt || toPlainText(featuredPost.content, 150)}
                      </p>
                      <div className="flex items-center gap-6 text-sm text-muted-foreground mb-6">
                        <span className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {featuredPost.author}
                        </span>
                        <span className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {new Date(featuredPost.created_at).toLocaleDateString('en-US', { 
                            month: 'long', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </span>
                        <span className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {featuredPost.read_time || '5 min read'}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-2 text-primary font-semibold group-hover:gap-3 transition-all">
                        Read More <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            </section>
          )}

          {/* Blog Grid */}
          {otherPosts.length > 0 && (
            <section className="py-12 bg-muted/30">
              <div className="container mx-auto px-4">
                <h2 className="text-2xl font-bold text-foreground mb-8">Latest Articles</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {otherPosts.map((post) => (
                    <Link
                      key={post.id}
                      to={`/blog/${post.slug || post.id}`}
                      className="group bg-card rounded-xl overflow-hidden border border-border shadow-md hover:shadow-lg transition-all hover:-translate-y-1"
                    >
                      <div className="aspect-video overflow-hidden">
                        {post.image_url ? (
                          <img
                            src={post.image_url}
                            alt={resolveAlt(post.image_alt, post.title)}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <span className="text-muted-foreground">No image</span>
                          </div>
                        )}
                      </div>
                      <div className="p-6">
                        <Badge variant="outline" className="mb-3">
                          {post.category}
                        </Badge>
                        <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors line-clamp-2">
                          {post.title}
                        </h3>
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                          {post.excerpt || toPlainText(post.content, 100)}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(post.created_at).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {post.read_time || '5 min read'}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* Newsletter CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="bg-primary rounded-2xl p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
              Stay Updated with Industry Insights
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
              Subscribe to our newsletter for the latest news, maintenance tips, and exclusive offers.
            </p>
            <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg bg-background text-foreground border-0 focus:ring-2 focus:ring-accent"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-accent text-accent-foreground font-semibold rounded-lg hover:bg-accent/90 transition-colors"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Blog;
