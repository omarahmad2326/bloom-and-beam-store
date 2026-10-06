'use client';

import dynamic from 'next/dynamic';

const loading = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
  </div>
);

// Admin screens load in the browser only (they need the signed-in session), and each in its own
// chunk, so the editor code never ships with the public pages.
export const ADMIN_SCREENS = {
  '': dynamic(() => import('@/views/admin/AdminDashboard'), { ssr: false, loading }),
  products: dynamic(() => import('@/views/admin/AdminProducts'), { ssr: false, loading }),
  categories: dynamic(() => import('@/views/admin/AdminCategories'), { ssr: false, loading }),
  parts: dynamic(() => import('@/views/admin/AdminParts'), { ssr: false, loading }),
  services: dynamic(() => import('@/views/admin/AdminServices'), { ssr: false, loading }),
  blog: dynamic(() => import('@/views/admin/AdminBlog'), { ssr: false, loading }),
  faqs: dynamic(() => import('@/views/admin/AdminFAQs'), { ssr: false, loading }),
  orders: dynamic(() => import('@/views/admin/AdminOrders'), { ssr: false, loading }),
  messages: dynamic(() => import('@/views/admin/AdminMessages'), { ssr: false, loading }),
  settings: dynamic(() => import('@/views/admin/AdminSettings'), { ssr: false, loading }),
  'home-cards': dynamic(() => import('@/views/admin/AdminHomeCards'), { ssr: false, loading }),
  'contact-settings': dynamic(() => import('@/views/admin/AdminContactSettings'), { ssr: false, loading }),
  redirects: dynamic(() => import('@/views/admin/AdminRedirects'), { ssr: false, loading }),
  about: dynamic(() => import('@/views/admin/AdminAboutPage'), { ssr: false, loading }),
  'contact-page': dynamic(() => import('@/views/admin/AdminContactPage'), { ssr: false, loading }),
  pages: dynamic(() => import('@/views/admin/AdminPages'), { ssr: false, loading }),
  footer: dynamic(() => import('@/views/admin/AdminFooter'), { ssr: false, loading }),
} as const;

export type AdminSection = keyof typeof ADMIN_SCREENS;

export function AdminScreen({ section }: { section: AdminSection }) {
  const Screen = ADMIN_SCREENS[section];
  return <Screen />;
}
