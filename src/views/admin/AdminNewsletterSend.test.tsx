// Sending a newsletter from the editor must leave the dashboard usable (no stuck modal overlay).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const campaign = {
  id: 'c1', subject: 'October news', status: 'draft', sent_count: 0, recipient_count: 0, failed_count: 0,
  sent_at: null, updated_at: new Date().toISOString(), content_html: '<p>Hello</p>', preheader: null, last_error: null,
};
const tables: Record<string, Record<string, unknown>[]> = {
  newsletter_campaigns: [campaign],
  newsletter_subscribers: [{ id: 's1', email: 'a@hospital.org', status: 'subscribed', created_at: new Date().toISOString(), source: 'footer', unsubscribed_at: null }],
};

vi.mock('@/integrations/supabase/client', () => {
  const from = (name: string) => {
    const rows = [...(tables[name] || [])];
    const q = {
      select: () => q, eq: () => q, in: () => q, order: () => q,
      update: () => q, insert: () => q,
      single: async () => ({ data: rows[0], error: null }),
      maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
      then: (resolve: (r: unknown) => void) => resolve({ data: rows, error: null }),
    };
    return q;
  };
  return { supabase: { from, rpc: async () => ({ data: null, error: null }), auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) } } };
});
vi.mock('./AdminLayout', () => ({ default: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAdmin: true, user: { email: 'admin@mrbedmed.com' } }) }));
vi.mock('@/components/admin/RichTextEditor', () => ({ default: () => <div>editor</div> }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import AdminNewsletter from './AdminNewsletter';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Newsletter: send to all', () => {
  it('closes the editor and leaves the page clickable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true, recipients: 1 }), { status: 202 })));
    render(<QueryClientProvider client={new QueryClient()}><AdminNewsletter /></QueryClientProvider>);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    fireEvent.click(await screen.findByRole('button', { name: /send to 1 subscriber/i }));
    fireEvent.click(await screen.findByRole('button', { name: /send now/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.body.style.pointerEvents).not.toBe('none'));
  });
});
