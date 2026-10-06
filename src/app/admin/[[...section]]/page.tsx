import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminScreen, type AdminSection } from '../AdminScreens';

export const metadata: Metadata = { title: { absolute: 'Admin | Mr.Bedmed' }, robots: { index: false, follow: false } };

const SECTIONS: AdminSection[] = [
  '', 'products', 'categories', 'parts', 'services', 'blog', 'faqs', 'orders', 'messages', 'settings',
  'home-cards', 'contact-settings', 'redirects', 'about', 'contact-page', 'pages', 'footer',
];

type Props = { params: Promise<{ section?: string[] }> };

export default async function AdminPage({ params }: Props) {
  const { section = [] } = await params;
  const key = section.join('/') as AdminSection;
  if (!SECTIONS.includes(key)) notFound();
  return <AdminScreen section={key} />;
}
