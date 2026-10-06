'use client';

import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Link, useNavigate } from '@/lib/router';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const Checkout = () => {
  const { items, getTotal, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    notes: ''
  });

  // Auto-fill form with logged-in user's info
  useEffect(() => {
    if (user) {
      const fullName = user.user_metadata?.full_name || '';
      const nameParts = fullName.split(' ');
      setFormData(prev => ({
        ...prev,
        firstName: nameParts[0] || prev.firstName,
        lastName: nameParts.slice(1).join(' ') || prev.lastName,
        email: user.email || prev.email,
      }));
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const orderItems = items.map(item => ({
      name: item.product.name,
      quantity: item.quantity,
      price: item.product.price
    }));

    const { error } = await supabase
      .from('orders')
      .insert({
        customer_name: `${formData.firstName} ${formData.lastName}`,
        customer_email: formData.email,
        customer_phone: formData.phone || null,
        shipping_address: `${formData.address}, ${formData.city}, ${formData.state} ${formData.zip}`,
        items: orderItems,
        total: getTotal(),
        notes: formData.notes || null,
        user_id: user?.id || null
      });

    if (error) {
      toast({ title: 'Error', description: 'Failed to place order. Please try again.', variant: 'destructive' });
    } else {
      toast({ title: 'Order Placed!', description: "Thank you for your order. We'll contact you shortly." });
      // Send email notification (fire-and-forget)
      supabase.functions.invoke('send-email', {
        body: {
          type: 'order',
          data: {
            customer_name: `${formData.firstName} ${formData.lastName}`,
            customer_email: formData.email,
            customer_phone: formData.phone || null,
            shipping_address: `${formData.address}, ${formData.city}, ${formData.state} ${formData.zip}`,
            items: orderItems,
            total: getTotal(),
            notes: formData.notes || null,
          }
        }
      }).catch(console.error);
      clearCart();
      navigate('/');
    }
    setIsSubmitting(false);
  };

  if (items.length === 0) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="font-display text-3xl font-bold mb-4">Your cart is empty</h1>
          <Button asChild><Link to="/products">Browse Products</Link></Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="py-16">
        <div className="container max-w-4xl">
          <h1 className="font-display text-4xl font-bold mb-8">Checkout</h1>
          <div className="grid lg:grid-cols-2 gap-12">
            <form onSubmit={handleSubmit} className="space-y-6">
              <h2 className="font-display font-bold text-xl">Contact Information</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input name="firstName" placeholder="First Name" required value={formData.firstName} onChange={handleChange} />
                <Input name="lastName" placeholder="Last Name" required value={formData.lastName} onChange={handleChange} />
              </div>
              <Input name="email" type="email" placeholder="Email" required value={formData.email} onChange={handleChange} />
              <Input name="phone" placeholder="Phone" value={formData.phone} onChange={handleChange} />
              
              <h2 className="font-display font-bold text-xl pt-4">Shipping Address</h2>
              <Input name="address" placeholder="Address" required value={formData.address} onChange={handleChange} />
              <div className="grid sm:grid-cols-3 gap-4">
                <Input name="city" placeholder="City" required value={formData.city} onChange={handleChange} />
                <Input name="state" placeholder="State" required value={formData.state} onChange={handleChange} />
                <Input name="zip" placeholder="ZIP" required value={formData.zip} onChange={handleChange} />
              </div>
              
              <h2 className="font-display font-bold text-xl pt-4">Order Notes (Optional)</h2>
              <Textarea name="notes" placeholder="Any special instructions or notes for your order..." rows={3} value={formData.notes} onChange={handleChange} />
              
              <Button type="submit" className="w-full btn-shine" size="lg" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Placing Order...</> : 'Place Order'}
              </Button>
            </form>
            <div className="bg-muted p-6 rounded-xl h-fit">
              <h2 className="font-display font-bold text-xl mb-4">Order Summary</h2>
              {items.map(item => (
                <div key={item.product.id} className="flex justify-between py-3 border-b">
                  <span>{item.product.name} × {item.quantity}</span>
                  <span className="font-bold">{'$' + (item.product.price * item.quantity).toLocaleString('en-US')}</span>
                </div>
              ))}
              <div className="flex justify-between py-4 font-display font-bold text-xl">
                <span>Total</span>
                <span className="text-primary">{'$' + getTotal().toLocaleString('en-US')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Checkout;
