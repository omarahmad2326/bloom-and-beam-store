'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, FileText, ShoppingCart, DollarSign, FolderOpen, Wrench, HelpCircle, Settings, Users } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { Link } from '@/lib/router';

interface Stats {
  products: number;
  categories: number;
  parts: number;
  blogPosts: number;
  faqs: number;
  orders: number;
  revenue: number;
  users: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ products: 0, categories: 0, parts: 0, blogPosts: 0, faqs: 0, orders: 0, revenue: 0, users: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [productsRes, categoriesRes, partsRes, blogRes, faqsRes, ordersRes, profilesRes] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('categories').select('id', { count: 'exact', head: true }),
        supabase.from('parts').select('id', { count: 'exact', head: true }),
        supabase.from('blog_posts').select('id', { count: 'exact', head: true }),
        supabase.from('faqs').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id, total'),
        supabase.from('profiles').select('id', { count: 'exact', head: true })
      ]);

      const revenue = ordersRes.data?.reduce((sum, order) => sum + Number(order.total), 0) || 0;

      setStats({
        products: productsRes.count || 0,
        categories: categoriesRes.count || 0,
        parts: partsRes.count || 0,
        blogPosts: blogRes.count || 0,
        faqs: faqsRes.count || 0,
        orders: ordersRes.data?.length || 0,
        revenue,
        users: profilesRes.count || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total Products', value: stats.products, icon: Package, color: 'text-blue-500' },
    { title: 'Categories', value: stats.categories, icon: FolderOpen, color: 'text-indigo-500' },
    { title: 'Spare Parts', value: stats.parts, icon: Wrench, color: 'text-orange-500' },
    { title: 'Blog Posts', value: stats.blogPosts, icon: FileText, color: 'text-green-500' },
    { title: 'FAQs', value: stats.faqs, icon: HelpCircle, color: 'text-cyan-500' },
    { title: 'Total Orders', value: stats.orders, icon: ShoppingCart, color: 'text-purple-500' },
    { title: 'Revenue', value: `$${stats.revenue.toLocaleString()}`, icon: DollarSign, color: 'text-yellow-500' },
    { title: 'Registered Users', value: stats.users, icon: Users, color: 'text-pink-500' },
  ];

  const quickActions = [
    { href: '/admin/products', icon: Package, title: 'Manage Products', description: 'Add, edit, or remove products' },
    { href: '/admin/categories', icon: FolderOpen, title: 'Manage Categories', description: 'Organize product categories' },
    { href: '/admin/parts', icon: Wrench, title: 'Manage Parts', description: 'Handle spare parts inventory' },
    { href: '/admin/blog', icon: FileText, title: 'Manage Blog', description: 'Create and publish articles' },
    { href: '/admin/faqs', icon: HelpCircle, title: 'Manage FAQs', description: 'Update frequently asked questions' },
    { href: '/admin/orders', icon: ShoppingCart, title: 'View Orders', description: 'Track customer orders' },
    { href: '/admin/settings', icon: Settings, title: 'Site Settings', description: 'Configure homepage content' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to the Mr.Bedmed admin panel</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">
                    {loading ? '...' : stat.value}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  to={action.href}
                  className="p-4 border rounded-lg hover:bg-muted transition-colors"
                >
                  <Icon className="h-8 w-8 text-primary mb-2" />
                  <h3 className="font-semibold">{action.title}</h3>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
