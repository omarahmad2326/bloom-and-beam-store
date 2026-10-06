import { useParams, Link, Navigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingCart, Minus, Plus, ArrowLeft, ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react';
import { SEOHead } from '@/components/seo/SEOHead';
import { JsonLd, CustomJsonLd } from '@/components/seo/JsonLd';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RedirectOrFallback } from '@/components/RedirectOrFallback';
import RichContent from '@/components/RichContent';
import { productSchema } from '@/lib/schema';
import { absoluteUrl } from '@/lib/site';
import { toPlainText } from '@/lib/content';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';
import { resolveAlt } from '@/lib/imageAlt';
import { isValidSlug } from '@/lib/slugify';

type Part = Tables<'parts'>;

const PartDetail = () => {
  const { id } = useParams();
  const [part, setPart] = useState<Part | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const { addToCart } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    const fetchPart = async () => {
      if (!id) return;
      
      // Try slug first, then fallback to UUID
      const { data: bySlug } = await supabase
        .from('parts')
        .select('*')
        .eq('slug', id)
        .maybeSingle();

      if (bySlug) {
        setPart(bySlug);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('parts')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        setPart(data);
      }
      setLoading(false);
    };

    fetchPart();
  }, [id]);

  const images = part?.image_urls || [];

  const prevImage = useCallback(() => {
    if (images.length === 0) return;
    setCurrentImageIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  }, [images.length]);

  const nextImage = useCallback(() => {
    if (images.length === 0) return;
    setCurrentImageIndex((i) => (i === images.length - 1 ? 0 : i + 1));
  }, [images.length]);

  const openLightbox = () => setIsLightboxOpen(true);
  const closeLightbox = () => setIsLightboxOpen(false);

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
  }, [isLightboxOpen, nextImage, prevImage]);

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

  if (loading) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading part details...</p>
        </div>
      </Layout>
    );
  }

  if (!part) {
    return (
      <RedirectOrFallback
        fallback={
          <Layout>
            <div className="container py-20 text-center">
              <h1 className="text-2xl font-bold mb-4">Part not found</h1>
              <Button asChild variant="outline">
                <Link to="/parts">Back to Parts</Link>
              </Button>
            </div>
          </Layout>
        }
      />
    );
  }

  // Opened by ID? Switch to the slug URL (the canonical one).
  if (part.slug && isValidSlug(part.slug) && id !== part.slug) return <Navigate to={`/part/${part.slug}`} replace />;

  const path = `/part/${part.slug || part.id}`;
  const summary = part.short_description || toPlainText(part.description, 160);
  const altFor = (i: number) => resolveAlt(part.image_alts?.[i], part.name);

  const handleAddToCart = () => {
    addToCart(
      {
        id: part.id,
        name: part.name,
        price: part.price,
        image: part.image_urls?.[0] || '',
        description: summary,
        category: part.category,
        features: [],
        inStock: part.in_stock,
        rating: 4.5,
        reviews: 0,
      },
      quantity
    );
    toast({ title: 'Added to cart', description: `${quantity}x ${part.name} added.` });
  };

  return (
    <Layout>
      <SEOHead
        title={part.meta_title || `${part.name} | Mr.Bedmed Parts`}
        description={part.meta_description || summary || `${part.name} - OEM replacement part from Mr.Bedmed`}
        canonicalUrl={absoluteUrl(path)}
        ogImage={absoluteUrl(part.image_urls?.[0])}
      />
      <JsonLd
        id="product"
        data={productSchema({
          name: part.name,
          path,
          image: part.image_urls?.[0],
          description: part.short_description || part.description,
          brand: part.make,
          sku: part.sku || part.part_no,
          price: part.price,
          inStock: part.in_stock,
          condition: part.condition,
        })}
      />
      <BreadcrumbSchema items={[{ name: 'Parts', path: '/parts' }, { name: part.name, path }]} />
      <CustomJsonLd value={part.custom_schema} />

      <section className="py-12 md:py-20">
        <div className="container">
          <Link to="/parts" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Parts
          </Link>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Images Section */}
            <div className="space-y-4">
              {/* Main Image */}
              <div 
                className="relative bg-white rounded-2xl p-8 border group cursor-zoom-in"
                onClick={openLightbox}
              >
                {images.length > 0 ? (
                  <>
                    <img
                      src={images[currentImageIndex]}
                      alt={altFor(currentImageIndex)}
                      className="w-full h-96 object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                    
                    {/* Zoom Indicator */}
                    <div className="absolute top-4 right-4 w-10 h-10 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <Maximize2 className="h-5 w-5" />
                    </div>

                    {images.length > 1 && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); prevImage(); }}
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/90 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-background"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); nextImage(); }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/90 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-background"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                        
                        {/* Image Counter */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
                          {currentImageIndex + 1} / {images.length}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="w-full h-96 flex items-center justify-center text-muted-foreground">
                    No image available
                  </div>
                )}
              </div>

              {/* Thumbnail Gallery */}
              {images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImageIndex(i)}
                      className={cn(
                        "flex-shrink-0 w-20 h-20 rounded-lg border-2 overflow-hidden transition-all",
                        i === currentImageIndex 
                          ? 'border-primary ring-2 ring-primary/30' 
                          : 'border-transparent hover:border-muted-foreground/50'
                      )}
                    >
                      <img src={img} alt={altFor(i)} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details Section */}
            <div className="space-y-6">
              {/* Category */}
              <span className="text-primary font-medium uppercase text-sm">{part.category}</span>

              {/* Name */}
              <h1 className="font-display text-3xl md:text-4xl font-bold">{part.name}</h1>

              {/* Price */}
              <div className="flex items-center gap-4">
                <span className="font-display text-3xl font-bold text-primary">
                  ${part.price.toFixed(2)}
                </span>
                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-sm font-medium",
                    part.in_stock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  )}
                >
                  {part.in_stock ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>

              {/* Description */}
              {part.short_description && (
                <p className="text-muted-foreground text-lg">{part.short_description}</p>
              )}
              {part.description && (
                <RichContent content={part.description} className="max-w-none" />
              )}

              {/* Add to Cart */}
              <div className="flex items-center gap-4 pt-6 border-t">
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
                  disabled={!part.in_stock}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Add to Cart
                </Button>
              </div>

              {/* Product Information */}
              <div className="bg-muted/50 rounded-xl p-6 mt-6">
                <h3 className="font-display font-bold mb-4">Product Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Condition:</span>
                    <p className="font-medium capitalize">{part.condition}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Category:</span>
                    <p className="font-medium">{part.category}</p>
                  </div>
                  {part.make && (
                    <div>
                      <span className="text-muted-foreground">Manufacturer:</span>
                      <p className="font-medium">{part.make}</p>
                    </div>
                  )}
                  {part.model && (
                    <div>
                      <span className="text-muted-foreground">Model:</span>
                      <p className="font-medium">{part.model}</p>
                    </div>
                  )}
                  {part.sku && (
                    <div>
                      <span className="text-muted-foreground">SKU:</span>
                      <p className="font-medium">{part.sku}</p>
                    </div>
                  )}
                  {part.part_no && (
                    <div>
                      <span className="text-muted-foreground">Part No.:</span>
                      <p className="font-medium">{part.part_no}</p>
                    </div>
                  )}
                  {part.asset_no && (
                    <div>
                      <span className="text-muted-foreground">Asset No.:</span>
                      <p className="font-medium">{part.asset_no}</p>
                    </div>
                  )}
                  {part.oem_no && (
                    <div>
                      <span className="text-muted-foreground">OEM No.:</span>
                      <p className="font-medium">{part.oem_no}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fullscreen Lightbox */}
      {isLightboxOpen && images.length > 0 && (
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
          {images.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-white font-medium">
              {currentImageIndex + 1} / {images.length}
            </div>
          )}

          {/* Navigation Arrows */}
          {images.length > 1 && (
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
              src={images[currentImageIndex]}
              alt={altFor(currentImageIndex)}
              className="max-w-full max-h-[80vh] object-contain mx-auto animate-scale-in"
            />
          </div>

          {/* Thumbnail Strip */}
          {images.length > 1 && (
            <div 
              className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-white/10 backdrop-blur-sm p-2 rounded-xl max-w-[90vw] overflow-x-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((img, index) => (
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
                    alt={altFor(index)}
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

export default PartDetail;