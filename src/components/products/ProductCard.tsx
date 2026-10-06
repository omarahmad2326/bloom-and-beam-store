import { Link } from '@/lib/router';
import { ShoppingCart, Star, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Product } from '@/data/products';
import { useCart } from '@/context/CartContext';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { resolveAlt } from '@/lib/imageAlt';

interface ProductCardProps {
  product: Product;
  index?: number;
}

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { addToCart } = useCart();
  const { toast } = useToast();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addToCart(product);
    toast({
      title: 'Added to cart',
      description: `${product.name} has been added to your cart.`,
    });
  };

  return (
    <div
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
          {product.isNew && (
            <span className="bg-secondary text-secondary-foreground text-xs font-bold px-3 py-1 rounded-full">
              NEW
            </span>
          )}
          {product.isBestseller && (
            <span className="bg-gold text-foreground text-xs font-bold px-3 py-1 rounded-full">
              BESTSELLER
            </span>
          )}
          {product.originalPrice && (
            <span className="bg-destructive text-destructive-foreground text-xs font-bold px-3 py-1 rounded-full">
              SALE
            </span>
          )}
        </div>

        {/* Product Image with 360° rotation */}
        <Link to={`/products/${product.slug || product.id}`} className="block h-full">
          <img
            src={product.image}
            alt={resolveAlt(product.imageAlt, product.name)}
            className="w-full h-full object-contain p-6 rotate-360-hover preserve-3d"
          />
        </Link>

        {/* Quick Actions */}
        <div className="absolute inset-x-0 bottom-0 p-4 flex gap-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <Button
            onClick={handleAddToCart}
            className="flex-1 btn-shine"
            size="sm"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Add to Cart
          </Button>
          <Button asChild variant="secondary" size="icon" className="flex-shrink-0">
            <Link to={`/products/${product.slug || product.id}`}>
              <Eye className="h-4 w-4" />
            </Link>
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
                i < Math.floor(product.rating)
                  ? 'text-gold fill-gold'
                  : 'text-muted-foreground'
              )}
            />
          ))}
          <span className="text-sm text-muted-foreground ml-1">({product.reviews})</span>
        </div>

        <span className="text-xs font-medium text-primary uppercase tracking-wide">
          {product.category}
        </span>

        <Link to={`/products/${product.slug || product.id}`}>
          <h3 className="font-display font-bold text-lg mt-1 mb-2 hover:text-primary transition-colors line-clamp-1">
            {product.name}
          </h3>
        </Link>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {product.description}
        </p>

        <div className="flex items-center gap-3">
          <span className="font-display font-bold text-xl text-primary">
            {'$' + product.price.toLocaleString('en-US')}
          </span>
          {product.originalPrice && (
            <span className="text-muted-foreground line-through">
              {'$' + product.originalPrice.toLocaleString('en-US')}
            </span>
          )}
        </div>

        {product.inStock ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-success mt-2">
            <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
            In Stock
          </span>
        ) : (
          <span className="text-sm text-destructive mt-2">Out of Stock</span>
        )}
      </div>
    </div>
  );
}
