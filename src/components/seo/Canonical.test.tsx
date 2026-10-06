import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup, waitFor, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

let productRow: Record<string, unknown> | null = null;
vi.mock('@/integrations/supabase/client', () => {
  const from = (table: string) => {
    let filter: [string, unknown] | null = null;
    const q = {
      select: () => q, neq: () => q, limit: () => q, in: () => q,
      eq: (col: string, val: unknown) => { filter = [col, val]; return q; },
      maybeSingle: async () => ({
        data: table === 'products' && productRow && productRow[filter![0]] === filter![1] ? productRow : null,
        error: null,
      }),
      then: (resolve: (r: unknown) => void) => resolve({ data: [], error: null }),
    };
    return q;
  };
  return { supabase: { from } };
});
vi.mock('@/components/layout/Layout', () => ({ Layout: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock('@/context/CartContext', () => ({ useCart: () => ({ addToCart: vi.fn() }) }));

import { canonicalFor } from '@/lib/site';
import ProductDetail from '@/views/ProductDetail';

const canonical = () => document.head.querySelectorAll('link[rel="canonical"]');

beforeEach(() => canonical().forEach((l) => l.remove()));
afterEach(() => { cleanup(); productRow = null; });

describe('canonicalFor (same rule as nginx)', () => {
  it('builds https non-www URLs without query or trailing slash', () => {
    expect(canonicalFor('/')).toBe('https://mrbedmed.com/');
    expect(canonicalFor('/products/')).toBe('https://mrbedmed.com/products');
    expect(canonicalFor('/services?type=rental')).toBe('https://mrbedmed.com/services');
    expect(canonicalFor('/x"><script>')).toBeUndefined();
  });
});

describe('product opened by ID', () => {
  it('switches to the slug URL so the canonical is the slug version', async () => {
    productRow = {
      id: '059b8ada-b15f-4c96-a573-bbee764b6b3c', slug: 'low-air-loss-burn-bed', name: 'Low Air Loss Burn Bed',
      description: '', short_description: null, price: 1, original_price: null, image_url: null, image_alt: null,
      image_urls: [], image_alts: [], category: 'Burn Bed', features: [], in_stock: true, condition: 'new',
      brand: null, meta_title: null, meta_description: null, custom_schema: null,
    };
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/products/059b8ada-b15f-4c96-a573-bbee764b6b3c']}>
          <Routes>
            <Route path="/products/:id" element={<><ProductDetail /><LocationProbe /></>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/products/low-air-loss-burn-bed'));
  });
});

import { useLocation } from 'react-router-dom';
function LocationProbe() {
  return <output data-testid="path">{useLocation().pathname}</output>;
}
