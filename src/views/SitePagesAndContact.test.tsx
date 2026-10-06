import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Minimal in-memory Supabase: tables[name] = rows; supports select/eq/in/order/maybeSingle/single.
const tables: Record<string, Record<string, unknown>[]> = {};
vi.mock('@/integrations/supabase/client', () => {
  const from = (name: string) => {
    let rows = [...(tables[name] || [])];
    const orderKeys: string[] = [];
    const q = {
      select: () => q,
      eq: (col: string, val: unknown) => { rows = rows.filter((r) => r[col] === val); return q; },
      in: (col: string, vals: unknown[]) => { rows = rows.filter((r) => vals.includes(r[col])); return q; },
      // Like PostgREST: later .order() calls are tie-breakers, not a re-sort.
      order: (col: string) => {
        orderKeys.push(col);
        rows = [...rows].sort((a, b) => {
          for (const k of orderKeys) if (a[k] !== b[k]) return (a[k] as number) > (b[k] as number) ? 1 : -1;
          return 0;
        });
        return q;
      },
      maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
      single: async () => (rows[0] ? { data: rows[0], error: null } : { data: null, error: { code: 'PGRST116' } }),
      then: (resolve: (r: unknown) => void) => resolve({ data: rows, error: null }),
    };
    return q;
  };
  return { supabase: { from, functions: { invoke: vi.fn(() => Promise.resolve({})) } } };
});

import SitePage from './SitePage';
import Contact from './Contact';
import { Footer } from '@/components/layout/Footer';
import { extractMapEmbedUrl, isValidMapEmbed } from '@/lib/contactPage';
import { isReservedPageSlug } from '@/lib/sitePages';

vi.mock('@/components/layout/Layout', () => ({ Layout: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));

afterEach(() => { cleanup(); for (const k of Object.keys(tables)) delete tables[k]; });

const wrap = (ui: React.ReactElement, path: string, routePath = '*') =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={routePath} element={ui} />
          <Route path="*" element={<p>other route</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

const page = (over: Record<string, unknown> = {}) => ({
  id: '1', title: 'Privacy Policy for Mr. Bed Med', slug: 'privacy', content_html: '<h2>Information We Collect</h2><p>We collect data.</p>',
  meta_title: null, meta_description: null, custom_schema: null, published: true, show_in_footer: true,
  footer_label: 'Privacy Policy', footer_order: 1, created_at: '2026-10-07T00:00:00Z', updated_at: '2026-10-07T00:00:00Z', ...over,
});

describe('SitePage (/:slug)', () => {
  it('renders the page title as the only H1 with its content', async () => {
    tables.site_pages = [page()];
    wrap(<SitePage />, '/privacy', '/:slug');
    await waitFor(() => screen.getByRole('heading', { level: 1, name: 'Privacy Policy for Mr. Bed Med' }));
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 2, name: 'Information We Collect' })).toBeTruthy();
    expect(screen.getByText(/Last updated:/)).toBeTruthy();
  });

  it('shows a draft banner for unpublished pages (admin preview)', async () => {
    tables.site_pages = [page({ published: false })];
    wrap(<SitePage />, '/privacy', '/:slug');
    await waitFor(() => screen.getByText(/Draft preview/));
  });

  it('follows a redirect for a renamed page', async () => {
    tables.site_pages = [page({ slug: 'privacy-policy' })];
    tables.redirects = [{ from_path: '/privacy', to_path: '/privacy-policy' }];
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/privacy']}>
          <Routes><Route path="/:slug" element={<SitePage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await waitFor(() => screen.getByRole('heading', { level: 1, name: 'Privacy Policy for Mr. Bed Med' }));
  });

  it('shows 404 for an unknown page', async () => {
    tables.site_pages = [];
    tables.redirects = [];
    wrap(<SitePage />, '/nope', '/:slug');
    await waitFor(() => screen.getByRole('heading', { level: 1, name: 'Page not found' }));
    expect(screen.getByRole('search')).toBeTruthy();
    expect(screen.getByRole('link', { name: /call/i }).getAttribute('href')).toMatch(/^tel:/);
  });
});

describe('Footer legal links', () => {
  it('lists published footer pages in order using the link text', async () => {
    tables.site_pages = [
      page({ slug: 'warranty', footer_label: 'Warranty Info', footer_order: 3 }),
      page({ slug: 'privacy', footer_label: 'Privacy Policy', footer_order: 1 }),
      page({ slug: 'returns', title: 'Return Policy', footer_label: null, footer_order: 2 }),
      page({ slug: 'hidden', footer_label: 'Hidden', show_in_footer: false }),
      page({ slug: 'draft', footer_label: 'Draft', published: false }),
    ];
    wrap(<Footer />, '/');
    const nav = await waitFor(() => screen.getByRole('navigation', { name: 'Legal' }));
    const links = [...nav.querySelectorAll('a')].map((a) => [a.textContent, a.getAttribute('href')]);
    expect(links).toEqual([['Privacy Policy', '/privacy'], ['Return Policy', '/returns'], ['Warranty Info', '/warranty']]);
  });

  it('links ICU Beds to the live category URL', async () => {
    wrap(<Footer />, '/');
    expect(screen.getByRole('link', { name: 'ICU Beds' }).getAttribute('href')).toBe('/category/icu-beds');
  });
});

describe('Contact page', () => {
  it('keeps the current text by default and hides empty sections', async () => {
    wrap(<Contact />, '/contact-us');
    await waitFor(() => screen.getByRole('heading', { level: 1, name: 'Contact Us' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Send Us a Message' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Frequently Asked Questions' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Areas We Serve' })).toBeNull();
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('pre-fills the form from a service quote button (?service=)', async () => {
    wrap(<Contact />, '/contact-us?service=Equipment%20Rental');
    await waitFor(() => expect((screen.getByLabelText('Subject') as HTMLInputElement).value).toBe('Service Request: Equipment Rental'));
  });

  it('pre-fills the form from a product quote button (?product=)', async () => {
    wrap(<Contact />, '/contact-us?product=Stryker%201007');
    await waitFor(() => expect((screen.getByLabelText('Subject') as HTMLInputElement).value).toBe('Quote Request: Stryker 1007'));
  });

  it('renders saved FAQs, cities and a valid Google map', async () => {
    tables.site_settings = [{
      key: 'contact_page',
      value: {
        h1: 'Contact Mrbedmed',
        faqs: [{ question: 'Do you deliver?', answer: 'Yes, across Texas.' }],
        cities: ['Dallas'],
        map_embed_url: 'https://www.google.com/maps/embed?pb=abc',
      },
    }];
    wrap(<Contact />, '/contact-us');
    await waitFor(() => screen.getByRole('heading', { level: 1, name: 'Contact Mrbedmed' }));
    expect(screen.getByText('Do you deliver?')).toBeTruthy();
    expect(screen.getByText('Dallas')).toBeTruthy();
    expect(document.querySelector('iframe')?.getAttribute('src')).toBe('https://www.google.com/maps/embed?pb=abc');
  });
});

describe('helpers', () => {
  it('only accepts Google Maps embeds, and extracts the URL from the iframe snippet', () => {
    expect(isValidMapEmbed('https://www.google.com/maps/embed?pb=1')).toBe(true);
    expect(isValidMapEmbed('https://evil.example.com/maps/embed?pb=1')).toBe(false);
    expect(extractMapEmbedUrl('<iframe src="https://www.google.com/maps/embed?pb=1&amp;x=2" width="600"></iframe>'))
      .toBe('https://www.google.com/maps/embed?pb=1&x=2');
  });

  it('reserves app paths as page slugs', () => {
    expect(isReservedPageSlug('products')).toBe(true);
    expect(isReservedPageSlug('return-policy')).toBe(false);
  });
});
