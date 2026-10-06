import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ShoppingCart, Eye, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { toPlainText } from '@/lib/content';
import { resolveAlt } from '@/lib/imageAlt';

interface DBProduct {
  id: string;
  name: string;
  description: string | null;
  short_description: string | null;
  image_alt: string | null;
  price: number;
  original_price: number | null;
  image_url: string | null;
  category: string;
  features: string[] | null;
  in_stock: boolean;
  slug: string | null;
}

export function FeaturedProducts() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toast } = useToast();

  const { data: products, isLoading } = useQuery({
    queryKey: ['featuredProducts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('in_stock', true)
        .order('created_at', { ascending: false })
        .limit(4);
      
      if (error) throw error;
      return data as DBProduct[];
    },
  });

  const handleAddToCart = (product: DBProduct, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
    });
    toast({
      title: 'Added to cart',
      description: `${product.name} has been added to your cart.`,
    });
  };

  return (
    <section className="py-20 md:py-28">
      <div className="container">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <span className="text-primary font-medium text-sm uppercase tracking-wider">
              Our Products
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-bold mt-2">
              Premium Medical Equipment
            </h2>
            <p className="text-muted-foreground mt-4 max-w-xl">
              Browse our selection of hospital-grade medical equipment, 
              designed for maximum patient comfort and caregiver efficiency.
            </p>
          </div>
          <Button asChild variant="outline" className="self-start md:self-auto">
            <Link to="/products">
              View All Products
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product, index) => (
              <div
                key={product.id}
                className={cn(
                  'group bg-card rounded-2xl overflow-hidden card-hover border border-border/50',
                  'opacity-0 animate-fade-in-up'
                )}
                style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'forwards' }}
              >
                {/* Image Container */}
                <div className="relative aspect-square bg-muted overflow-hidden perspective-1000">
                  {/* Badges */}
                  <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                    {product.original_price && (
                      <span className="bg-destructive text-destructive-foreground text-xs font-bold px-3 py-1 rounded-full">
                        SALE
                      </span>
                    )}
                  </div>

                  {/* Product Image */}
                  <div 
                    className="block h-full cursor-pointer"
                    onClick={() => navigate(`/products/${product.slug || product.id}`)}
                  >
                    <img
                      src={product.image_url || '/placeholder.svg'}
                      alt={resolveAlt(product.image_alt, product.name)}
                      className="w-full h-full object-contain p-6 rotate-360-hover preserve-3d"
                    />
                  </div>

                  {/* Quick Actions */}
                  <div className="absolute inset-x-0 bottom-0 p-4 flex gap-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <Button
                      onClick={(e) => handleAddToCart(product, e)}
                      className="flex-1 btn-shine"
                      size="sm"
                      disabled={!product.in_stock}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Add to Cart
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="icon" 
                      className="flex-shrink-0"
                      onClick={() => navigate(`/products/${product.slug || product.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className="flex items-center gap-1 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          'h-4 w-4',
                          i < 4 ? 'text-gold fill-gold' : 'text-muted-foreground'
                        )}
                      />
                    ))}
                    <span className="text-sm text-muted-foreground ml-1">(0)</span>
                  </div>

                  <span className="text-xs font-medium text-primary uppercase tracking-wide">
                    {product.category}
                  </span>

                  <div 
                    className="cursor-pointer"
                    onClick={() => navigate(`/products/${product.slug || product.id}`)}
                  >
                    <h3 className="font-display font-bold text-lg mt-1 mb-2 hover:text-primary transition-colors line-clamp-1">
                      {product.name}
                    </h3>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {product.short_description || toPlainText(product.description, 160)}
                  </p>

                  <div className="flex items-center gap-3">
                    <span className="font-display font-bold text-xl text-primary">
                      ${product.price.toLocaleString()}
                    </span>
                    {product.original_price && (
                      <span className="text-muted-foreground line-through">
                        ${product.original_price.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {product.in_stock ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-success mt-2">
                      <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
                      In Stock
                    </span>
                  ) : (
                    <span className="text-sm text-destructive mt-2">Out of Stock</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No products available at the moment.
          </div>
        )}
      </div>
    </section>
  );
}