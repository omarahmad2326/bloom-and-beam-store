import { NextResponse } from 'next/server';
import { supabaseAs } from '@/lib/server/newsletter';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Unsubscribe by token. Used by the unsubscribe page and by mail apps' one-click unsubscribe
 * (List-Unsubscribe-Post: RFC 8058 sends a POST to this URL with ?token=…).
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  let token = url.searchParams.get('token') || '';
  if (!token && req.headers.get('content-type')?.includes('application/json')) {
    token = (await req.json().catch(() => ({}))).token || '';
  }
  if (!UUID.test(token)) return NextResponse.json({ ok: false, error: 'Invalid unsubscribe link.' }, { status: 400 });

  const { data, error } = await supabaseAs().rpc('newsletter_unsubscribe', { p_token: token });
  if (error) return NextResponse.json({ ok: false, error: 'Could not unsubscribe right now. Please try again.' }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: 'This unsubscribe link is no longer valid.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
