import { useParams, Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/layout/Layout';
import { SEOHead } from '@/components/seo/SEOHead';
import { JsonLd, CustomJsonLd } from '@/components/seo/JsonLd';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RedirectOrFallback } from '@/components/RedirectOrFallback';
import RichContent from '@/components/RichContent';
import { Button } from '@/components/ui/button';
import { QuoteButton } from '@/components/QuoteButton';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ShoppingCart, Check, Clock, Settings, Award, Phone, PackageSearch } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useContactInfo } from '@/hooks/useContactInfo';
import { Product as CartProduct } from '@/data/products';
import { faqPageSchema } from '@/lib/schema';
import { absoluteUrl } from '@/lib/site';
import { isContentEmpty, toPlainText } from '@/lib/content';
import type { Tables } from '@/integrations/supabase/types';
import { resolveAlt } from '@/lib/imageAlt';
import { CallButton } from '@/components/CallButton';

type Category = Tables<'categories'>;
type Product = Tables<'products'>;

const DEFAULT_HERO = 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=1920';
const whyChooseIcons = [Check, Clock, Settings, Award];

/** Quote a value for a PostgREST or() filter. */
const pgQuote = (value: string) => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

async function fetchCategory(slug: string): Promise<Category | null> {
  // Case-insensitive: some legacy slugs contain capitals (e.g. "Chair-stretcher").
  const { data, error } = await supabase.from('categories').select('*').ilike('slug', slug).limit(1).maybeSingle();
  if (error) throw error;
  if (data) return data;

  // Home-page menu items can point at a slug that differs from the category's own slug;
  // resolve them by name so those links keep working.
  const { data: item } = await supabase
    .from('home_service_card_items')
    .select('name')
    .ilike('slug', slug)
    .limit(1)
    .maybeSingle();
  if (!item) return null;

  const { data: byName } = await supabase.from('categories').select('*').ilike('name', item.name).limit(1).maybeSingle();
  return byName ?? null;
}

const asFaqs = (value: unknown) =>
  Array.isArray(value)
    ? value
        .filter((v): v is { question: string; answer: string } => !!v && typeof v === 'object' && 'question' in v && 'answer' in v)
        .filter((f) => f.question && f.answer)
    : [];

export default function CategoryDetail() {
  const { slug = '' } = useParams<{ slug: string }>();
  const normalizedSlug = slug.toLowerCase();
  const { addToCart } = useCart();
  const { contactInfo } = useContactInfo();

  const { data: category, isLoading: categoryLoading } = useQuery({
    queryKey: ['category', normalizedSlug],
    queryFn: () => fetchCategory(normalizedSlug),
    enabled: !!normalizedSlug && slug === normalizedSlug,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['category-products', category?.id],
    enabled: !!category,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`category_id.eq.${category!.id},category.ilike.${pgQuote(category!.name)}`)
        .order('in_stock', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

  // Category URLs are lowercase; /category/ICU-bed → /category/icu-bed.
  if (slug !== normalizedSlug) {
    return <Navigate to={`/category/${normalizedSlug}`} replace />;
  }

  if (categoryLoading) {
    return (
      <Layout>
        <div className="container py-24 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  if (!category) {
    return (
      <RedirectOrFallback
        fallback={
          <Layout>
            <div className="container py-16 text-center">
              <h1 className="text-2xl font-bold mb-4">Category Not Found</h1>
              <p className="text-muted-foreground mb-8">The category you're looking for doesn't exist.</p>
              <Button asChild>
                <Link to="/products">View All Products</Link>
              </Button>
            </div>
          </Layout>
        }
      />
    );
  }

  const path = `/category/${category.slug.toLowerCase()}`;
  const faqs = asFaqs(category.faqs);
  const hasIntro = !isContentEmpty(category.intro_html);
  const phone = contactInfo.phone || '+1 469 767 8853';
  const tel = `tel:${phone.replace(/[^\d+]/g, '')}`;
  const description =
    category.meta_description || toPlainText(category.intro_html, 160) || category.description || undefined;

  const whyChoose = category.why_choose ?? [];
  const listSections = [
    { title: 'Key Features', items: category.key_features ?? [] },
    { title: 'Benefits', items: category.benefits ?? [] },
    { title: 'Ideal For', items: category.ideal_for ?? [] },
  ].filter((s) => s.items.length > 0);

  const hasMainContent = hasIntro || whyChoose.length > 0 || listSections.length > 0;

  const handleAdd = (product: Product) => {
    const cartProduct: CartProduct = {
      id: product.id,
      name: product.name,
      description: product.short_description || toPlainText(product.description, 200),
      price: product.price,
      image: product.image_url || '',
      category: product.category,
      features: product.features || [],
      inStock: product.in_stock,
      rating: 4.5,
      reviews: 0,
    };
    addToCart(cartProduct);
  };

  return (
    <Layout>
      <SEOHead
        title={category.meta_title || `${category.name} | Mr.Bedmed Hospital Beds & Stretcher Solutions`}
        description={description}
        canonicalUrl={absoluteUrl(path)}
        ogImage={absoluteUrl(category.image_url)}
      />
      <BreadcrumbSchema items={[{ name: 'Products', path: '/products' }, { name: category.name, path }]} />
      <JsonLd id="faq" data={faqPageSchema(faqs)} />
      <CustomJsonLd value={category.custom_schema} />

      {/* Hero */}
      <section className="relative bg-primary/90 text-primary-foreground py-16 md:py-24 overflow-hidden">
        {category.image_url ? (
          <img
            src={category.image_url}
            alt={resolveAlt(category.image_alt, category.name)}
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
        ) : (
          <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${DEFAULT_HERO})` }} />
        )}
        <div className="container relative z-10">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold max-w-3xl">{category.name}</h1>
        </div>
      </section>

      {/* Main content (only sections with content are shown) */}
      {hasMainContent && (
        <section className="py-12 md:py-16">
          <div className="container">
            <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
              <div className="lg:col-span-2 space-y-10">
                {hasIntro && <RichContent content={category.intro_html} />}

                {whyChoose.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold mb-6">Why Choose Our {category.name}?</h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {whyChoose.map((item, index) => {
                        const Icon = whyChooseIcons[index % whyChooseIcons.length];
                        return (
                          <div key={index} className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <span className="font-medium">{item}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {listSections.map((section) => (
                  <div key={section.title}>
                    <h2 className="text-2xl font-bold mb-4">{section.title}</h2>
                    <ul className="grid sm:grid-cols-2 gap-3">
                      {section.items.map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="lg:col-span-1">
                <QuoteSidebar phone={phone} tel={tel} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Products in this category: always shown */}
      <section className={`py-12 md:py-16 ${hasMainContent ? 'bg-accent/30' : ''}`}>
        <div className="container">
          <div className={hasMainContent ? '' : 'grid lg:grid-cols-3 gap-8 lg:gap-12'}>
            <div className={hasMainContent ? '' : 'lg:col-span-2'}>
              <h2 className="text-3xl font-bold mb-8">Products in {category.name}</h2>

              {productsLoading ? (
                <div className="grid md:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-48 bg-muted rounded-lg mb-4" />
                        <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                        <div className="h-4 bg-muted rounded w-1/2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : products.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <PackageSearch className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                    <p className="mb-4 text-muted-foreground">No products are listed in this category yet. Contact us for availability.</p>
                    <div className="flex flex-wrap justify-center gap-3">
                      <Button asChild variant="outline"><Link to="/products">Browse all products</Link></Button>
                      <QuoteButton to={`/contact-us?product=${encodeURIComponent(category.name)}`} showArrow={false}>Ask about {category.name}</QuoteButton>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className={`grid gap-6 ${hasMainContent ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                  {products.map((product) => (
                    <Link key={product.id} to={`/products/${product.slug || product.id}`} className="block group">
                      <Card className="hover:shadow-lg transition-shadow h-full">
                        <CardContent className="p-6">
                          {product.image_url && (
                            <div className="aspect-square mb-4 overflow-hidden rounded-lg bg-muted perspective-1000">
                              <img
                                src={product.image_url}
                                alt={resolveAlt(product.image_alt, product.name)}
                                loading="lazy"
                                className="w-full h-full object-contain p-4 rotate-360-hover preserve-3d"
                              />
                            </div>
                          )}
                          <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">{product.name}</h3>
                          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                            {product.short_description || toPlainText(product.description, 160)}
                          </p>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-2xl font-bold text-primary">${product.price.toLocaleString()}</span>
                            {product.in_stock ? (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleAdd(product);
                                }}
                              >
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                Add
                              </Button>
                            ) : (
                              <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">Out of stock</span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {!hasMainContent && (
              <div className="lg:col-span-1">
                <QuoteSidebar phone={phone} tel={tel} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FAQs */}
      {faqs.length > 0 && (
        <section className="py-12 md:py-16">
          <div className="container max-w-3xl">
            <h2 className="text-3xl font-bold mb-6">{category.name} FAQs</h2>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground whitespace-pre-line">{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      )}

      {/* CTA */}
      {(category.cta_title || category.cta_text) && (
        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container text-center">
            {category.cta_title && <h2 className="text-3xl font-bold mb-4">{category.cta_title}</h2>}
            {category.cta_text && <p className="max-w-2xl mx-auto mb-8 text-primary-foreground/80">{category.cta_text}</p>}
            <div className="flex flex-wrap justify-center gap-4">
              <Button asChild size="lg" variant="secondary">
                <Link to="/contact-us">Contact Our Experts</Link>
              </Button>
              <CallButton tone="onDark" />
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
}

function QuoteSidebar({ phone, tel }: { phone: string; tel: string }) {
  return (
    <Card className="sticky top-24 shadow-lg">
      <CardContent className="p-6">
        <h3 className="text-xl font-bold mb-6">Get a Quote</h3>
        <QuoteButton to="/contact-us" className="w-full mb-4" showArrow={false}>
          Request a Quote
        </QuoteButton>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Phone className="h-4 w-4" />
          <a href={tel} className="hover:text-primary transition-colors font-medium">{phone}</a>
        </div>
      </CardContent>
    </Card>
  );
}
