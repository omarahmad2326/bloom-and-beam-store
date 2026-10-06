import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

let contactPhone: string | null = null;
const category = {
  id: 'c1', name: 'Fully Electric Bed', slug: 'fully-electric-bed', description: null, image_url: null, image_alt: null,
  intro_html: null, why_choose: [], key_features: [], benefits: [], ideal_for: [], faqs: [],
  cta_title: 'Need Help Choosing?', cta_text: 'Our specialists are ready to help.', meta_title: null, meta_description: null, custom_schema: null,
};
vi.mock('@/integrations/supabase/client', () => {
  const from = (table: string) => {
    const q = {
      select: () => q, eq: () => q, ilike: () => q, or: () => q, order: () => q, limit: () => q, in: () => q,
      maybeSingle: async () => ({
        data: table === 'categories' ? category : table === 'site_settings' && contactPhone ? { value: { phone: contactPhone } } : null,
        error: null,
      }),
      single: async () => (table === 'site_settings' && contactPhone
        ? { data: { value: { phone: contactPhone } }, error: null }
        : { data: null, error: { code: 'PGRST116' } }),
      then: (resolve: (r: unknown) => void) => resolve({ data: [], error: null }),
    };
    return q;
  };
  return { supabase: { from } };
});
vi.mock('@/components/layout/Layout', () => ({ Layout: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock('@/context/CartContext', () => ({ useCart: () => ({ addToCart: vi.fn() }) }));

import { CallButton, telHref } from './CallButton';
import CategoryDetail from '@/views/CategoryDetail';

afterEach(() => { cleanup(); contactPhone = null; });

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('CallButton', () => {
  it('is a click-to-call link with readable colours on dark boxes', () => {
    render(<QueryClientProvider client={client()}><CallButton tone="onDark" /></QueryClientProvider>);
    const link = screen.getByRole('link', { name: 'Call +1 469 767 8853' });
    expect(link.getAttribute('href')).toBe('tel:+14697678853');
    // Never white text on a white background at rest.
    expect(link.className).toContain('bg-white');
    expect(link.className).toContain('text-primary');
    expect(link.className).not.toMatch(/(^|\s)text-white(\s|$)/);
  });

  it('uses the phone number from Contact Info', async () => {
    contactPhone = '+1 (214) 555-0100';
    render(<QueryClientProvider client={client()}><CallButton /></QueryClientProvider>);
    const link = await screen.findByRole('link', { name: 'Call +1 (214) 555-0100' });
    expect(link.getAttribute('href')).toBe('tel:+12145550100');
  });

  it('formats tel links', () => {
    expect(telHref('+1 469 767 8853')).toBe('tel:+14697678853');
  });
});

describe('Category "Need Help Choosing?" box', () => {
  it('shows a readable click-to-call button (no white-on-white outline button)', async () => {
    render(
      <QueryClientProvider client={client()}>
        <MemoryRouter initialEntries={['/category/fully-electric-bed']}>
          <Routes><Route path="/category/:slug" element={<CategoryDetail />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await waitFor(() => screen.getByRole('heading', { name: 'Need Help Choosing?' }));
    const call = screen.getByRole('link', { name: 'Call +1 469 767 8853' });
    expect(call.getAttribute('href')).toBe('tel:+14697678853');
    expect(call.className).toContain('text-primary');
    expect(call.className).not.toContain('bg-background');
  });
});
