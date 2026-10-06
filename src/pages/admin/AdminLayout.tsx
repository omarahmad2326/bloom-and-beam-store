import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  Package, 
  FileText, 
  ShoppingCart, 
  LayoutDashboard, 
  LogOut, 
  Home, 
  Settings,
  FolderOpen,
  Wrench,
  HelpCircle,
  MessageSquare,
  LayoutGrid,
  Phone,
  CornerUpRight
} from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, loading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Fetch pending orders and unread messages count
  useEffect(() => {
    const fetchCounts = async () => {
      const [ordersRes, messagesRes] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('contact_messages').select('id', { count: 'exact', head: true }).eq('read', false)
      ]);
      
      setPendingOrdersCount(ordersRes.count || 0);
      setUnreadMessagesCount(messagesRes.count || 0);
    };

    if (user && isAdmin) {
      fetchCounts();

      // Subscribe to realtime updates
      const ordersChannel = supabase
        .channel('admin-orders-count')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchCounts)
        .subscribe();

      const messagesChannel = supabase
        .channel('admin-messages-count')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_messages' }, fetchCounts)
        .subscribe();

      return () => {
        supabase.removeChannel(ordersChannel);
        supabase.removeChannel(messagesChannel);
      };
    }
  }, [user, isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/products', icon: Package, label: 'Products' },
    { path: '/admin/categories', icon: FolderOpen, label: 'Categories' },
    { path: '/admin/home-cards', icon: LayoutGrid, label: 'Home Cards' },
    { path: '/admin/parts', icon: Wrench, label: 'Parts' },
    { path: '/admin/services', icon: Wrench, label: 'Services' },
    { path: '/admin/blog', icon: FileText, label: 'Blog Posts' },
    { path: '/admin/faqs', icon: HelpCircle, label: 'FAQs' },
    { path: '/admin/orders', icon: ShoppingCart, label: 'Orders', badge: pendingOrdersCount },
    { path: '/admin/messages', icon: MessageSquare, label: 'Messages', badge: unreadMessagesCount },
    { path: '/admin/settings', icon: Settings, label: 'Site Settings' },
    { path: '/admin/contact-settings', icon: Phone, label: 'Contact Info' },
    { path: '/admin/redirects', icon: CornerUpRight, label: 'Redirects' },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border min-h-screen p-4 flex flex-col">
        <div className="mb-8">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-primary">
            <span className="text-2xl">🏥</span>
            Mr.Bedmed Admin
          </Link>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5" />
                  {item.label}
                </div>
                {item.badge && item.badge > 0 && (
                  <span className={`min-w-5 h-5 flex items-center justify-center text-xs font-bold rounded-full ${
                    isActive ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground'
                  }`}>
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2 pt-4 border-t border-border">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Home className="h-5 w-5" />
            View Site
          </Link>
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </Button>
        </div>

        {!isAdmin && (
          <div className="mt-4 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
            <p className="text-xs text-yellow-600">
              You don't have admin privileges. Contact an admin to get access.
            </p>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
