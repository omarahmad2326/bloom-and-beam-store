import { X, Minus, Plus, ShoppingBag, Trash2, Package } from 'lucide-react';
import { Link } from '@/lib/router';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export function CartSidebar() {
  const { items, isCartOpen, setIsCartOpen, removeFromCart, updateQuantity, getTotal } = useCart();
  const { user } = useAuth();
  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-foreground/50 z-50 transition-opacity duration-300',
          isCartOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setIsCartOpen(false)}
      />

      {/* Sidebar */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-full md:w-[450px] bg-card z-50 shadow-2xl transition-transform duration-300 ease-out',
          isCartOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-6 w-6 text-primary" />
              <h2 className="font-display font-bold text-xl">Your Cart</h2>
              <span className="bg-primary text-primary-foreground text-sm font-bold px-2.5 py-0.5 rounded-full">
                {items.length}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsCartOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-6">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="font-display font-bold text-lg mb-2">Your cart is empty</h3>
                <p className="text-muted-foreground mb-6">
                  Browse our products and add items to your cart
                </p>
                <Button asChild onClick={() => setIsCartOpen(false)}>
                  <Link to="/products">Browse Products</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {items.map((item, index) => (
                  <div
                    key={item.product.id}
                    className="flex gap-4 p-4 bg-muted rounded-lg animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="w-24 h-24 bg-background rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium mb-1 line-clamp-1">{item.product.name}</h4>
                      <p className="text-primary font-bold">{'$' + item.product.price.toLocaleString('en-US')}</p>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2 bg-background rounded-lg p-1">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center rounded hover:bg-muted transition-colors"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center rounded hover:bg-muted transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t p-6 space-y-4">
              <div className="flex items-center justify-between text-lg">
                <span className="font-medium">Subtotal</span>
                <span className="font-display font-bold">{'$' + getTotal().toLocaleString('en-US')}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Shipping and taxes calculated at checkout
              </p>
              <div className="space-y-3">
                <Button asChild className="w-full btn-shine" size="lg">
                  <Link to="/checkout" onClick={() => setIsCartOpen(false)}>
                    Proceed to Checkout
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full"
                  size="lg"
                  onClick={() => setIsCartOpen(false)}
                >
                  <Link to="/cart">View Cart</Link>
                </Button>
                {user && (
                  <Button
                    asChild
                    variant="ghost"
                    className="w-full"
                    size="lg"
                    onClick={() => setIsCartOpen(false)}
                  >
                    <Link to="/orders" className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Order History
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
