import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const tables: Record<string, Record<string, unknown>[]> = {};
const inserts: { table: string; row: unknown }[] = [];
vi.mock('@/integrations/supabase/client', () => {
  const from = (name: string) => {
    let rows = [...(tables[name] || [])];
    const q = {
      select: () => q,
      eq: (col: string, val: unknown) => { rows = rows.filter((r) => r[col] === val); return q; },
      order: () => q,
      maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
      single: async () => (rows[0] ? { data: rows[0], error: null } : { data: null, error: { code: 'PGRST116' } }),
      insert: async (row: unknown) => { inserts.push({ table: name, row }); return { error: null }; },
      then: (resolve: (r: unknown) => void) => resolve({ data: rows, error: null }),
    };
    return q;
  };
  return { supabase: { from } };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { Footer } from './Footer';
import { DEFAULT_FOOTER, isValidFooterUrl, renderCopyright } from '@/lib/footer';

afterEach(() => { cleanup(); for (const k of Object.keys(tables)) delete tables[k]; inserts.length = 0; });

const renderFooter = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter><Footer /></MemoryRouter>
    </QueryClientProvider>,
  );

const setFooter = (value: Record<string, unknown>) => { tables.site_settings = [{ key: 'footer', value }]; };

describe('Footer (Dashboard → Footer)', () => {
  it('renders the original footer content when nothing has been saved', async () => {
    renderFooter();
    expect(screen.getByRole('heading', { name: 'Stay Updated' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Quick Links' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'ICU Beds' }).getAttribute('href')).toBe('/category/icu-beds');
    expect(screen.getByText(/Important Notice:/)).toBeTruthy();
    expect(screen.getByText(`© ${new Date().getFullYear()} Mr.Bedmed. All rights reserved.`)).toBeTruthy();
  });

  it('uses saved columns, copyright and switches sections off', async () => {
    setFooter({
      ...DEFAULT_FOOTER,
      newsletter_enabled: false,
      notice_enabled: false,
      description: 'Texas medical equipment partner.',
      columns: [{ title: 'Company', links: [{ label: 'Careers', url: 'https://jobs.example.com' }, { label: 'Email us', url: 'mailto:sales@example.com' }] }],
      copyright: 'Copyright {year} Mrbedmed LLC',
    });
    renderFooter();
    await waitFor(() => screen.getByRole('heading', { name: 'Company' }));
    expect(screen.queryByRole('heading', { name: 'Quick Links' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Stay Updated' })).toBeNull();
    expect(screen.queryByText(/Important Notice:/)).toBeNull();
    expect(screen.getByText('Texas medical equipment partner.')).toBeTruthy();
    const careers = screen.getByRole('link', { name: 'Careers' });
    expect(careers.getAttribute('target')).toBe('_blank');
    expect(careers.getAttribute('rel')).toContain('noopener');
    expect(screen.getByRole('link', { name: 'Email us' }).getAttribute('href')).toBe('mailto:sales@example.com');
    expect(screen.getByText(`Copyright ${new Date().getFullYear()} Mrbedmed LLC`)).toBeTruthy();
  });

  it('sends newsletter sign-ups to the newsletter API (with the honeypot field)', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true, status: 'subscribed' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    renderFooter();
    fireEvent.change(screen.getByLabelText('Enter your email'), { target: { value: 'buyer@hospital.org' } });
    fireEvent.click(screen.getByRole('button', { name: 'Subscribe' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/newsletter/subscribe');
    expect(JSON.parse(String(init.body))).toEqual({ email: 'buyer@hospital.org', website: '' });
    expect(inserts).toHaveLength(0);
    vi.unstubAllGlobals();
  });

  it('hides social icons that have no link', async () => {
    tables.site_settings = [{ key: 'contact_info', value: { social_links: { facebook: 'https://facebook.com/mrbedmed', twitter: '', linkedin: '', instagram: '' } } }];
    renderFooter();
    await waitFor(() => screen.getByRole('link', { name: 'Facebook' }));
    expect(screen.queryByRole('link', { name: 'LinkedIn' })).toBeNull();
  });
});

describe('footer helpers', () => {
  it('validates link URLs', () => {
    for (const ok of ['/products', 'https://x.com/a', 'mailto:a@b.co', 'tel:+1 469 767 8853']) expect(isValidFooterUrl(ok)).toBe(true);
    for (const bad of ['products', '//evil.com', 'javascript:alert(1)', 'mailto:nope', '']) expect(isValidFooterUrl(bad)).toBe(false);
  });
  it('replaces {year}', () => {
    expect(renderCopyright('© {year} Mrbedmed', new Date('2027-01-02'))).toBe('© 2027 Mrbedmed');
  });
});
