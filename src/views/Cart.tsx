'use client';

import { Link } from '@/lib/router';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';

const Cart = () => {
  const { items, removeFromCart, updateQuantity, getTotal } = useCart();

  if (items.length === 0) {
    return (
      <Layout>
        <section className="py-20">
          <div className="container max-w-4xl mx-auto text-center">
            <ShoppingBag className="h-20 w-20 text-muted-foreground mx-auto mb-6" />
            <h1 className="font-display text-3xl font-bold mb-4">Your Cart is Empty</h1>
            <p className="text-muted-foreground mb-8">
              Looks like you haven't added any items to your cart yet.
            </p>
            <Button asChild size="lg">
              <Link to="/products">Browse Products</Link>
            </Button>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="py-12 md:py-20">
        <div className="container max-w-4xl mx-auto">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-8">Shopping Cart</h1>

          <div className="space-y-6">
            {items.map((item) => (
              <div
                key={item.product.id}
                className="flex gap-4 md:gap-6 p-4 md:p-6 bg-card rounded-xl border"
              >
                <div className="w-24 h-24 md:w-32 md:h-32 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <Link 
                    to={`/products/${item.product.id}`}
                    className="font-semibold text-lg hover:text-primary transition-colors line-clamp-2"
                  >
                    {item.product.name}
                  </Link>
                  <p className="text-sm text-muted-foreground mt-1">{item.product.category}</p>
                  <p className="text-primary font-bold text-lg mt-2">
                    {'$' + item.product.price.toLocaleString('en-US')}
                  </p>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-background transition-colors"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-10 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center rounded hover:bg-background transition-colors"
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
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                <div className="hidden md:block text-right">
                  <p className="text-lg font-bold">
                    {'$' + (item.product.price * item.quantity).toLocaleString('en-US')}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-8 p-6 bg-card rounded-xl border">
            <div className="flex items-center justify-between text-lg mb-2">
              <span>Subtotal ({items.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
              <span className="font-bold">{'$' + getTotal().toLocaleString('en-US')}</span>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Shipping and taxes calculated at checkout
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild variant="outline" className="flex-1">
                <Link to="/products">Continue Shopping</Link>
              </Button>
              <Button asChild className="flex-1 btn-shine">
                <Link to="/checkout">
                  Proceed to Checkout
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Cart;
