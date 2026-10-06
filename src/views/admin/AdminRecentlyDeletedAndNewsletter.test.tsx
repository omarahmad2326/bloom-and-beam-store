import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const rpcCalls: { fn: string; args?: unknown }[] = [];
let deletedRows: Record<string, unknown>[] = [];
const tables: Record<string, Record<string, unknown>[]> = {};

vi.mock('@/integrations/supabase/client', () => {
  const from = (name: string) => {
    const rows = [...(tables[name] || [])];
    const q = {
      select: () => q,
      eq: () => q,
      in: () => q,
      order: () => q,
      maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
      then: (resolve: (r: unknown) => void) => resolve({ data: rows, error: null }),
    };
    return q;
  };
  const rpc = async (fn: string, args?: unknown) => {
    rpcCalls.push({ fn, args });
    if (fn === 'list_deleted_items') return { data: deletedRows, error: null };
    if (fn === 'restore_deleted_item') {
      deletedRows = deletedRows.filter((r) => r.id !== (args as { p_id: number }).p_id);
      return { data: {}, error: null };
    }
    return { data: null, error: null };
  };
  return { supabase: { from, rpc, auth: { getSession: async () => ({ data: { session: null } }) } } };
});
vi.mock('./AdminLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAdmin: true, user: { email: 'admin@mrbedmed.com' } }) }));
vi.mock('@/components/admin/RichTextEditor', () => ({ default: () => <div>editor</div> }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import AdminRecentlyDeleted from './AdminRecentlyDeleted';
import AdminNewsletter from './AdminNewsletter';

afterEach(() => {
  cleanup();
  rpcCalls.length = 0;
  for (const k of Object.keys(tables)) delete tables[k];
});

const wrap = (ui: ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

describe('Dashboard → Recently Deleted', () => {
  it('lists deleted items with type, who deleted them and time left, and restores one', async () => {
    deletedRows = [
      { id: 2, table_name: 'products', row_id: 'p1', label: 'Stryker 1015', deleted_at: hoursAgo(2), deleted_by_email: 'admin@mrbedmed.com' },
      { id: 1, table_name: 'blog_posts', row_id: 'b1', label: 'Bed care tips', deleted_at: hoursAgo(24 * 6 + 1), deleted_by_email: null },
    ];
    wrap(<AdminRecentlyDeleted />);
    const row = (await screen.findByText('Stryker 1015')).closest('tr')!;
    expect(within(row).getByText('Product')).toBeTruthy();
    expect(within(row).getByText('6 days left')).toBeTruthy();
    expect(within(row).getByText('by admin@mrbedmed.com')).toBeTruthy();
    expect(screen.getByText('Bed care tips').closest('tr')!.textContent).toContain('22 hours left');

    fireEvent.click(within(row).getByRole('button', { name: /restore/i }));
    await waitFor(() => expect(rpcCalls).toContainEqual({ fn: 'restore_deleted_item', args: { p_id: 2 } }));
    await waitFor(() => expect(screen.queryByText('Stryker 1015')).toBeNull());
  });

  it('shows an empty state', async () => {
    deletedRows = [];
    wrap(<AdminRecentlyDeleted />);
    expect(await screen.findByText('Nothing was deleted in the last 7 days.')).toBeTruthy();
  });
});

describe('Dashboard → Newsletter', () => {
  it('shows subscriber count, campaigns and subscribers', async () => {
    tables.newsletter_campaigns = [
      { id: 'c1', subject: 'October news', status: 'sent', sent_count: 2, recipient_count: 2, failed_count: 0, sent_at: hoursAgo(1), updated_at: hoursAgo(1), content_html: '<p>x</p>', preheader: null, last_error: null },
    ];
    tables.newsletter_subscribers = [
      { id: 's1', email: 'a@hospital.org', status: 'subscribed', created_at: hoursAgo(5), source: 'footer', unsubscribed_at: null },
      { id: 's2', email: 'b@clinic.org', status: 'unsubscribed', created_at: hoursAgo(9), source: 'footer', unsubscribed_at: hoursAgo(1) },
    ];
    wrap(<AdminNewsletter />);
    expect(await screen.findByText('October news')).toBeTruthy();
    expect(screen.getByText(/^1 subscriber ·/)).toBeTruthy();
    expect(screen.getByText('2 / 2')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Subscribers (1)' })).toBeTruthy();
  });
});
