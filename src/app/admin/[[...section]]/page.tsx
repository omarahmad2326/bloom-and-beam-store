import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminScreen, type AdminSection } from '../AdminScreens';

export const metadata: Metadata = { title: { absolute: 'Admin | Mr.Bedmed' }, robots: { index: false, follow: false } };

// Record<AdminSection, …> makes TypeScript reject a screen that is missing here.
const SECTION_KEYS: Record<AdminSection, true> = {
  '': true, products: true, categories: true, parts: true, services: true, blog: true, faqs: true, orders: true,
  messages: true, settings: true, 'home-cards': true, 'contact-settings': true, redirects: true, about: true,
  'contact-page': true, pages: true, footer: true, newsletter: true, 'recently-deleted': true,
};
const SECTIONS = Object.keys(SECTION_KEYS) as AdminSection[];

type Props = { params: Promise<{ section?: string[] }> };

export default async function AdminPage({ params }: Props) {
  const { section = [] } = await params;
  const key = section.join('/') as AdminSection;
  if (!SECTIONS.includes(key)) notFound();
  return <AdminScreen section={key} />;
}
