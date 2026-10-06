import { useParams, Link, useNavigate, Navigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { QuoteButton } from '@/components/QuoteButton';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, Minus, Plus, Check, ArrowLeft, ChevronLeft, ChevronRight, Loader2, X, Maximize2, MessageSquareQuote } from 'lucide-react';
import { cn } from '@/lib/utils';
import RichContent from '@/components/RichContent';
import { SEOHead } from '@/components/seo/SEOHead';
import { JsonLd, CustomJsonLd } from '@/components/seo/JsonLd';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RedirectOrFallback } from '@/components/RedirectOrFallback';
import { productSchema } from '@/lib/schema';
import { absoluteUrl } from '@/lib/site';
import { toPlainText } from '@/lib/content';
import type { Tables } from '@/integrations/supabase/types';
import { resolveAlt } from '@/lib/imageAlt';
import { isValidSlug } from '@/lib/slugify';

type Product = Tables<'products'>;

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const { addToCart } = useCart();
  const { toast } = useToast();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      // Try slug first, then fallback to UUID
      const { data: bySlug } = await supabase
        .from('products')
        .select('*')
        .eq('slug', id)
        .maybeSingle();
      
      if (bySlug) return bySlug as Product;

      const { data: byId, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return byId as Product | null;
    },
    enabled: !!id,
  });

  // Fetch related products from the same category
  const { data: relatedProducts } = useQuery({
    queryKey: ['relatedProducts', product?.category, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, image_url, image_alt, price, category, slug')
        .eq('category', product!.category)
        .neq('id', id)
        .limit(4);
      
      if (error) throw error;
      return data;
    },
    enabled: !!product?.category && !!id,
  });

  // Combine main image with additional images
  const allImages = [
    product?.image_url,
    ...(product?.image_urls || [])
  ].filter(Boolean) as string[];

  // ALT text per image, aligned with allImages.
  const imageAlts = [
    ...(product?.image_url ? [resolveAlt(product.image_alt, product.name)] : []),
    ...(product?.image_urls || []).map((_, i) => resolveAlt(product?.image_alts?.[i], product?.name ?? '')),
  ];

  const nextImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev + 1) % Math.max(1, allImages.length));
  }, [allImages.length]);

  const prevImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev - 1 + Math.max(1, allImages.length)) % Math.max(1, allImages.length));
  }, [allImages.length]);

  const openLightbox = useCallback((index?: number) => {
    if (typeof index === 'number') {
      setCurrentImageIndex(index);
    }
    setIsLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setIsLightboxOpen(false);
  }, []);

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLightboxOpen) return;
      
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowRight') {
        nextImage();
      } else if (e.key === 'ArrowLeft') {
        prevImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, nextImage, prevImage, closeLightbox]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    if (isLightboxOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isLightboxOpen]);

  const handleAddToCart = useCallback(() => {
    if (!product) return;
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image_url || '/placeholder.svg',
      category: product.category,
      description: product.short_description || toPlainText(product.description, 200),
      features: product.features || [],
      rating: 4.5,
      reviews: 0,
      inStock: product.in_stock,
    }, quantity);
    toast({ title: 'Added to cart', description: `${quantity}x ${product.name} added.` });
  }, [product, quantity, addToCart, toast]);

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-20 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <RedirectOrFallback
        fallback={
          <Layout>
            <div className="container py-20 text-center">
              <h2 className="text-2xl font-bold mb-4">Product not found</h2>
              <Link to="/" className="text-primary hover:underline">Return to Home</Link>
            </div>
          </Layout>
        }
      />
    );
  }

  // Opened by ID? Switch to the slug URL (the canonical one).
  if (product.slug && isValidSlug(product.slug) && id !== product.slug) return <Navigate to={`/products/${product.slug}`} replace />;

  const path = `/products/${product.slug || product.id}`;
  const summary = product.short_description || toPlainText(product.description, 160);

  return (
    <Layout>
      <SEOHead
        title={product.meta_title || `${product.name} | Mr.Bedmed`}
        description={product.meta_description || summary || undefined}
        canonicalUrl={absoluteUrl(path)}
        ogImage={absoluteUrl(product.image_url)}
      />
      <JsonLd
        id="product"
        data={productSchema({
          name: product.name,
          path,
          image: product.image_url || product.image_urls?.[0],
          description: product.short_description || product.description,
          brand: product.brand,
          price: product.price,
          inStock: product.in_stock,
          condition: product.condition,
        })}
      />
      <BreadcrumbSchema items={[{ name: 'Products', path: '/products' }, { name: product.name, path }]} />
      <CustomJsonLd value={product.custom_schema} />
      <section className="py-12 md:py-20">
        <div className="container">
          <Link to="/products" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Image Carousel */}
            <div className="space-y-4">
              <div 
                className="relative bg-muted rounded-2xl p-8 aspect-square overflow-hidden group cursor-zoom-in"
                onClick={() => openLightbox()}
              >
                {allImages.length > 0 ? (
                  <img 
                    src={allImages[currentImageIndex]}
                    alt={imageAlts[currentImageIndex] ?? product.name}
                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105" 
                  />
                ) : (
                  <img 
                    src="/placeholder.svg" 
                    alt={product.name} 
                    className="w-full h-full object-contain" 
                  />
                )}
                
                {/* Zoom Indicator */}
                <div className="absolute top-4 right-4 w-10 h-10 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="h-5 w-5" />
                </div>
                
                {/* Navigation Arrows */}
                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); prevImage(); }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-background transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); nextImage(); }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-background transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                )}

                {/* Image Counter */}
                {allImages.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
                    {currentImageIndex + 1} / {allImages.length}
                  </div>
                )}
              </div>

              {/* Thumbnail Strip */}
              {allImages.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {allImages.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={cn(
                        "flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all",
                        currentImageIndex === index 
                          ? "border-primary ring-2 ring-primary/30" 
                          : "border-transparent hover:border-muted-foreground/30"
                      )}
                    >
                      <img 
                        src={img} 
                        alt={imageAlts[index] ?? product.name}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              <span className="text-primary font-medium uppercase text-sm">{product.category}</span>
              <h1 className="font-display text-3xl md:text-4xl font-bold">{product.name}</h1>
              
              <div className="flex items-center gap-4">
                <span className="font-display text-3xl font-bold text-primary">${product.price.toLocaleString()}</span>
                {product.original_price && (
                  <span className="text-xl text-muted-foreground line-through">
                    ${product.original_price.toLocaleString()}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className={cn(
                  "inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium",
                  product.in_stock ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                )}>
                  {product.in_stock ? "In Stock" : "Out of Stock"}
                </div>
                {product.brand && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-muted text-foreground">
                    {product.brand}
                  </div>
                )}
                <div className={cn(
                  "inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium",
                  product.condition === 'new' && "bg-blue-100 text-blue-700",
                  product.condition === 'used' && "bg-amber-100 text-amber-700",
                  product.condition === 'refurbished' && "bg-purple-100 text-purple-700"
                )}>
                  {product.condition === 'new' ? 'New' : product.condition === 'used' ? 'Used' : 'Refurbished'}
                </div>
              </div>

              {product.short_description && (
                <p className="text-lg text-muted-foreground">{product.short_description}</p>
              )}

              {product.description && (
                <RichContent content={product.description} className="max-w-none" />
              )}

              {product.features && product.features.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-display font-bold">Features:</h3>
                  <ul className="space-y-2">
                    {product.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col gap-4 pt-6 border-t">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 bg-muted rounded-lg p-2">
                    <button 
                      onClick={() => setQuantity(Math.max(1, quantity - 1))} 
                      className="w-10 h-10 flex items-center justify-center rounded hover:bg-background transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-10 text-center font-bold">{quantity}</span>
                    <button 
                      onClick={() => setQuantity(quantity + 1)} 
                      className="w-10 h-10 flex items-center justify-center rounded hover:bg-background transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <Button 
                    onClick={handleAddToCart} 
                    size="lg" 
                    className="flex-1 btn-shine"
                    disabled={!product.in_stock}
                  >
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Add to Cart
                  </Button>
                </div>
                <QuoteButton
                  to={`/contact-us?product=${encodeURIComponent(product.name)}`}
                  variant="outline"
                  className="w-full"
                  showArrow={false}
                >
                  <MessageSquareQuote className="mr-2 h-5 w-5" />
                  Get Quote
                </QuoteButton>
              </div>
            </div>
          </div>

          {/* Related Products Section */}
          {relatedProducts && relatedProducts.length > 0 && (
            <div className="mt-16 pt-12 border-t">
              <h2 className="font-display text-2xl md:text-3xl font-bold mb-8">Related Products</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {relatedProducts.map((relProduct) => (
                  <div 
                    key={relProduct.id}
                    className="group cursor-pointer"
                    onClick={() => navigate(`/products/${relProduct.slug || relProduct.id}`)}
                  >
                    <div className="bg-muted rounded-xl overflow-hidden aspect-square mb-3 relative perspective-1000">
                      <img 
                        src={relProduct.image_url || '/placeholder.svg'} 
                        alt={resolveAlt(relProduct.image_alt, relProduct.name)}
                        className="w-full h-full object-contain p-4 rotate-360-hover preserve-3d"
                      />
                    </div>
                    <h3 className="font-medium text-sm md:text-base line-clamp-2 group-hover:text-primary transition-colors">
                      {relProduct.name}
                    </h3>
                    <p className="text-primary font-bold mt-1">${relProduct.price.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Fullscreen Lightbox */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center animate-fade-in"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors"
          >
            <X className="h-6 w-6 text-white" />
          </button>

          {/* Image Counter */}
          {allImages.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-white font-medium">
              {currentImageIndex + 1} / {allImages.length}
            </div>
          )}

          {/* Navigation Arrows */}
          {allImages.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="h-8 w-8 text-white" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors"
              >
                <ChevronRight className="h-8 w-8 text-white" />
              </button>
            </>
          )}

          {/* Main Image */}
          <div 
            className="max-w-[90vw] max-h-[85vh] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={allImages[currentImageIndex] || '/placeholder.svg'}
              alt={imageAlts[currentImageIndex] ?? product?.name}
              className="max-w-full max-h-[80vh] object-contain mx-auto animate-scale-in"
            />
          </div>

          {/* Thumbnail Strip */}
          {allImages.length > 1 && (
            <div 
              className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-white/10 backdrop-blur-sm p-2 rounded-xl max-w-[90vw] overflow-x-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {allImages.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={cn(
                    "flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                    currentImageIndex === index 
                      ? "border-white ring-2 ring-white/50" 
                      : "border-transparent opacity-60 hover:opacity-100"
                  )}
                >
                  <img 
                    src={img} 
                    alt={imageAlts[index] ?? product?.name}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Keyboard Hint */}
          <div className="absolute bottom-4 right-4 text-white/50 text-sm hidden md:block">
            Use ← → to navigate • ESC to close
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ProductDetail;