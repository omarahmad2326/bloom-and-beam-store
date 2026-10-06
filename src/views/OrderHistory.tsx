'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/lib/router';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Package, ArrowLeft, Loader2 } from 'lucide-react';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  status: string;
  created_at: string;
  shipping_address: string;
}

const OrderHistory = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const typedOrders = data.map(order => ({
          ...order,
          items: (order.items as unknown) as OrderItem[]
        }));
        setOrders(typedOrders);
      }
      setLoading(false);
    };

    fetchOrders();
  }, [user]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { timeZone: 'America/Chicago',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'processing': return 'bg-blue-100 text-blue-700';
      case 'shipped': return 'bg-purple-100 text-purple-700';
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (!user) {
    return (
      <Layout>
        <section className="py-20">
          <div className="container max-w-2xl mx-auto text-center">
            <Package className="h-20 w-20 text-muted-foreground mx-auto mb-6" />
            <h1 className="font-display text-3xl font-bold mb-4">Sign in to View Orders</h1>
            <p className="text-muted-foreground mb-8">
              You need to be signed in to view your order history.
            </p>
            <Button asChild size="lg">
              <Link to="/auth">Sign In</Link>
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
          <Link 
            to="/products" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Products
          </Link>

          <h1 className="font-display text-3xl md:text-4xl font-bold mb-8">Order History</h1>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="font-display text-xl font-bold mb-2">No Orders Yet</h2>
                <p className="text-muted-foreground mb-6">
                  You haven't placed any orders yet.
                </p>
                <Button asChild>
                  <Link to="/products">Start Shopping</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <Card key={order.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Order ID: <span className="font-mono">{order.id.slice(0, 8)}...</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(order.created_at)}
                        </p>
                      </div>
                      <span className={`px-3 py-1 text-sm rounded-full capitalize font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>

                    <div className="space-y-3 border-t pt-4">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.name} × {item.quantity}</span>
                          <span className="font-medium">{'$' + (item.price * item.quantity).toLocaleString('en-US')}</span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t mt-4 pt-4 flex justify-between">
                      <span className="font-semibold">Total</span>
                      <span className="font-bold text-primary">{'$' + order.total.toLocaleString('en-US')}</span>
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        <strong>Shipping to:</strong> {order.shipping_address}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default OrderHistory;
