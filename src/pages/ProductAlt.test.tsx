import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, waitFor, cleanup, fireEvent, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

let productRow: Record<string, unknown> | null = null;
vi.mock('@/integrations/supabase/client', () => {
  const from = (table: string) => {
    const q = {
      select: () => q, eq: () => q, neq: () => q, limit: () => q, in: () => q,
      maybeSingle: async () => ({ data: table === 'products' ? productRow : null, error: null }),
      then: (resolve: (r: unknown) => void) => resolve({ data: [], error: null }),
    };
    return q;
  };
  return { supabase: { from } };
});
vi.mock('@/components/layout/Layout', () => ({ Layout: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock('@/context/CartContext', () => ({ useCart: () => ({ addToCart: vi.fn() }) }));

import ProductDetail from './ProductDetail';
import ImageUpload from '@/components/admin/ImageUpload';

afterEach(cleanup);

const baseProduct = {
  id: 'p1', name: 'Stryker 1115 Prime', slug: 'stryker-1115-prime', description: '<p>Stretcher</p>', short_description: null,
  price: 2500, original_price: null, category: 'ER Stretcher', features: [], in_stock: true, condition: 'refurbished',
  brand: 'Stryker', meta_title: null, meta_description: null, custom_schema: null,
};

const renderProduct = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/products/stryker-1115-prime']}>
        <Routes><Route path="/products/:id" element={<ProductDetail />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('product images output the dashboard ALT text (A4 "done when")', () => {
  it('main + each gallery image: typed text, decorative alt="", and name fallback for old items', async () => {
    productRow = {
      ...baseProduct,
      image_url: 'https://cdn/main.webp',
      image_alt: 'Stryker 1115 Prime stretcher, side rails up',
      image_urls: ['https://cdn/g1.webp', 'https://cdn/g2.webp', 'https://cdn/g3.webp'],
      image_alts: ['Stryker 1115 Prime wheel brake close-up', '', null],
    };
    const { container } = renderProduct();
    await waitFor(() => expect(container.querySelector('img[src="https://cdn/main.webp"]')).toBeTruthy());
    const altOf = (src: string) => [...container.querySelectorAll(`img[src="${src}"]`)].map((i) => i.getAttribute('alt'));
    expect(altOf('https://cdn/main.webp')[0]).toBe('Stryker 1115 Prime stretcher, side rails up');
    expect(altOf('https://cdn/g1.webp')).toContain('Stryker 1115 Prime wheel brake close-up');
    expect(altOf('https://cdn/g2.webp')).toContain(''); // decorative
    expect(altOf('https://cdn/g3.webp')).toContain('Stryker 1115 Prime'); // old item → name, never "view 3"
    expect(container.innerHTML).not.toMatch(/view \d/);
  });

  it('old product with no ALT at all falls back to the product name', async () => {
    productRow = { ...baseProduct, image_url: 'https://cdn/old.png', image_alt: null, image_urls: [], image_alts: [] };
    const { container } = renderProduct();
    await waitFor(() => expect(container.querySelector('img[src="https://cdn/old.png"]')?.getAttribute('alt')).toBe('Stryker 1115 Prime'));
  });
});

describe('ImageUpload ALT field', () => {
  function Harness() {
    const [alt, setAlt] = useState<string | null>(null);
    return (
      <>
        <ImageUpload bucket="product-images" currentUrl="https://cdn/x.webp" onImageChange={() => {}} alt={alt} onAltChange={setAlt} allowDecorative requireAlt />
        <output data-testid="alt">{alt === null ? 'NULL' : JSON.stringify(alt)}</output>
      </>
    );
  }

  it('is required, supports "Decorative image" (alt="") and clearing back to missing', () => {
    render(<Harness />);
    expect(screen.getByText(/ALT text is required/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/ALT text/), { target: { value: 'Side view' } });
    expect(screen.getByTestId('alt').textContent).toBe('"Side view"');
    fireEvent.change(screen.getByLabelText(/ALT text/), { target: { value: '' } });
    expect(screen.getByTestId('alt').textContent).toBe('NULL');
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByTestId('alt').textContent).toBe('""');
    expect(screen.queryByText(/ALT text is required/)).toBeNull();
    expect((screen.getByLabelText(/ALT text/) as HTMLInputElement).disabled).toBe(true);
  });
});
