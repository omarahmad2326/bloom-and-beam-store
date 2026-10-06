import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import ProductGallery from "./pages/ProductGallery";
import CategoryDetail from "./pages/CategoryDetail";
import Services from "./pages/Services";
import ServiceDetail from "./pages/ServiceDetail";
import Parts from "./pages/Parts";
import PartDetail from "./pages/PartDetail";
import About from "./pages/About";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Checkout from "./pages/Checkout";
import Cart from "./pages/Cart";
import OrderHistory from "./pages/OrderHistory";
import Auth from "./pages/Auth";
import AccountSettings from "./pages/AccountSettings";
import SitePage from "./pages/SitePage";
import NotFound from "./pages/NotFound";
import SitemapXml from "./pages/SitemapXml";

// Admin pages (and the rich-text editor they use) load on demand, keeping the public bundle small.
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminCategories = lazy(() => import("./pages/admin/AdminCategories"));
const AdminParts = lazy(() => import("./pages/admin/AdminParts"));
const AdminServices = lazy(() => import("./pages/admin/AdminServices"));
const AdminBlog = lazy(() => import("./pages/admin/AdminBlog"));
const AdminFAQs = lazy(() => import("./pages/admin/AdminFAQs"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminMessages = lazy(() => import("./pages/admin/AdminMessages"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminHomeCards = lazy(() => import("./pages/admin/AdminHomeCards"));
const AdminContactSettings = lazy(() => import("./pages/admin/AdminContactSettings"));
const AdminRedirects = lazy(() => import("./pages/admin/AdminRedirects"));
const AdminAboutPage = lazy(() => import("./pages/admin/AdminAboutPage"));
const AdminContactPage = lazy(() => import("./pages/admin/AdminContactPage"));
const AdminPages = lazy(() => import("./pages/admin/AdminPages"));

const AdminFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
  </div>
);

// Redirect old /gallery/ URLs to /category/
const GalleryRedirect = () => {
  const slug = window.location.pathname.split('/gallery/')[1];
  return <Navigate to={`/category/${slug}`} replace />;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<AdminFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/sitemap.xml" element={<SitemapXml />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/gallery/:slug" element={<GalleryRedirect />} />
              <Route path="/category/:slug" element={<CategoryDetail />} />
              <Route path="/services" element={<Services />} />
              <Route path="/services/:slug" element={<ServiceDetail />} />
              <Route path="/parts" element={<Parts />} />
              <Route path="/part/:id" element={<PartDetail />} />
              <Route path="/about-us" element={<About />} />
              <Route path="/contact-us" element={<Contact />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:id" element={<BlogPost />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/orders" element={<OrderHistory />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/account" element={<AccountSettings />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/products" element={<AdminProducts />} />
              <Route path="/admin/categories" element={<AdminCategories />} />
              <Route path="/admin/parts" element={<AdminParts />} />
              <Route path="/admin/services" element={<AdminServices />} />
              <Route path="/admin/blog" element={<AdminBlog />} />
              <Route path="/admin/faqs" element={<AdminFAQs />} />
              <Route path="/admin/orders" element={<AdminOrders />} />
              <Route path="/admin/messages" element={<AdminMessages />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
              <Route path="/admin/home-cards" element={<AdminHomeCards />} />
              <Route path="/admin/contact-settings" element={<AdminContactSettings />} />
              <Route path="/admin/redirects" element={<AdminRedirects />} />
              <Route path="/admin/about" element={<AdminAboutPage />} />
              <Route path="/admin/contact-page" element={<AdminContactPage />} />
              <Route path="/admin/pages" element={<AdminPages />} />
              {/* Admin-managed content pages (Privacy, Terms, Warranty, …). Static routes above take precedence. */}
              <Route path="/:slug" element={<SitePage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
