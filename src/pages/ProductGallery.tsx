import { useParams, Link, useNavigate } from 'react-router-dom';
import { resolveAlt } from '@/lib/imageAlt';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/layout/Layout';
import { SEOHead } from '@/components/seo/SEOHead';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  image_url: string | null;
  image_alt: string | null;
  image_alts: (string | null)[] | null;
  image_urls: string[] | null;
  price: number;
  category: string;
  slug: string | null;
}

const ProductGallery = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  // Fetch category info from home_service_card_items (dynamic lookup)
  const { data: categoryItem, isLoading: categoryLoading } = useQuery({
    queryKey: ['category-item', slug],
    queryFn: async () => {
      if (!slug) return null;
      
      // First try to find in home_service_card_items
      const { data: cardItem } = await supabase
        .from('home_service_card_items')
        .select('name, slug')
        .eq('slug', slug)
        .maybeSingle();
      
      if (cardItem) {
        return { name: cardItem.name, categoryFilter: cardItem.name };
      }
      
      // If not found, try to find in categories table
      const { data: category } = await supabase
        .from('categories')
        .select('name, slug')
        .eq('slug', slug)
        .maybeSingle();
      
      if (category) {
        return { name: category.name, categoryFilter: category.name };
      }
      
      // Fallback: use slug to construct a filter (convert slug to title case)
      const formattedName = slug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      return { name: formattedName, categoryFilter: formattedName };
    },
    enabled: !!slug,
  });
  
  const categoryName = categoryItem?.name || 'Products';
  const categoryFilter = categoryItem?.categoryFilter || '';

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products-gallery', categoryFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, image_url, image_alt, image_alts, price, category, slug')
        .eq('category', categoryFilter);
      
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!categoryFilter && categoryFilter.length > 0,
    staleTime: 0,
  });

  const isLoading = categoryLoading || productsLoading;

  const handleImageClick = (product: Product) => {
    navigate(`/products/${product.slug || product.id}`);
  };

  return (
    <Layout>
      <SEOHead
        title={`${categoryName} Gallery | Mr.Bedmed`}
        description={`Browse our collection of ${categoryName}. Click on any image to view detailed product information.`}
      />
      
      <section className="py-12 md:py-20">
        <div className="container">
          {/* Back Button */}
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>

          {/* Header */}
          <div className="text-center mb-12">
            <span className="text-primary font-medium text-sm uppercase tracking-wider">
              Product Gallery
            </span>
            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mt-2">
              {categoryName}
            </h1>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              Click on any image to view detailed product information
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Products Grid - Show one card per product using main image */}
          {!isLoading && products && products.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product, index) => {
                // Use main image or fallback to first additional image or placeholder
                const displayImage = product.image_url || (product.image_urls && product.image_urls[0]) || '/placeholder.svg';
                const totalImages = [product.image_url, ...(product.image_urls || [])].filter(Boolean).length;

                return (
                  <div
                    key={product.id}
                    onClick={() => handleImageClick(product)}
                    className={cn(
                      "group cursor-pointer bg-card rounded-xl border overflow-hidden",
                      "transition-all duration-300 hover:shadow-xl hover:-translate-y-2 hover:border-primary/50",
                      "opacity-0 animate-fade-in"
                    )}
                    style={{ 
                      animationDelay: `${index * 50}ms`, 
                      animationFillMode: 'forwards' 
                    }}
                  >
                    {/* Image Container */}
                    <div className="aspect-square bg-muted overflow-hidden perspective-1000">
                      <img
                        src={displayImage}
                        alt={resolveAlt(product.image_url ? product.image_alt : product.image_alts?.[0], product.name)}
                        className="w-full h-full object-contain p-4 rotate-360-hover preserve-3d"
                      />
                    </div>
                    
                    {/* Product Info */}
                    <div className="p-4">
                      <h3 className="font-display font-semibold text-sm md:text-base line-clamp-2 group-hover:text-primary transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-primary font-bold mt-2">
                        ${product.price.toLocaleString()}
                      </p>
                      {totalImages > 1 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {totalImages} images available
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && (!products || products.length === 0) && (
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <ArrowLeft className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="font-display text-xl font-bold mb-2">No Products Found</h3>
              <p className="text-muted-foreground mb-6">
                We're adding products to this category soon. Check back later!
              </p>
              <Link 
                to="/" 
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                <ArrowLeft className="h-4 w-4" /> Return to Home
              </Link>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default ProductGallery;