import { NextResponse } from 'next/server';
import { WELCOME_HTML, WELCOME_SUBJECT } from '@/lib/newsletterEmail';
import { composeEmail, contactInfo, isNewsletterConfigured, sendOne, supabaseAs } from '@/lib/server/newsletter';

export const dynamic = 'force-dynamic';

// Simple per-IP limit against form spam (the server is a single process).
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 5;
}

/** Footer sign-up: { email, website } ("website" is a hidden honeypot field bots fill in). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (body.website) return NextResponse.json({ ok: true, status: 'subscribed' });

  const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (limited(ip)) {
    return NextResponse.json({ ok: false, error: 'Too many attempts. Please try again later.' }, { status: 429 });
  }

  const { data, error } = await supabaseAs().rpc('newsletter_subscribe', { p_email: email, p_source: 'footer' });
  if (error) {
    const invalid = error.code === '22023';
    return NextResponse.json(
      { ok: false, error: invalid ? 'Please enter a valid email address.' : 'Could not subscribe right now. Please try again.' },
      { status: invalid ? 400 : 500 },
    );
  }

  const result = data as { status: string; token?: string };
  // Welcome email only for new (or returning) subscribers, never repeatedly to the same address.
  if (result.token && isNewsletterConfigured()) {
    const contact = await contactInfo();
    const sent = await sendOne(
      composeEmail({ subject: WELCOME_SUBJECT, content_html: WELCOME_HTML }, email.toLowerCase(), result.token, contact),
      contact,
    );
    if (!sent.ok) console.error('[newsletter] welcome email failed:', sent.error);
  }
  return NextResponse.json({ ok: true, status: result.status });
}
