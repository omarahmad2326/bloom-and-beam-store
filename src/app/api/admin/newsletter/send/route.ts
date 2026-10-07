import { NextResponse, after } from 'next/server';
import {
  adminFromRequest,
  composeEmail,
  contactInfo,
  isNewsletterConfigured,
  sendMany,
  sendOne,
} from '@/lib/server/newsletter';

export const dynamic = 'force-dynamic';

/**
 * Dashboard → Newsletter (admins only, Authorization: Bearer <access token>).
 *   { campaignId, testEmail }  sends one test copy
 *   { campaignId }             sends to every subscribed address; runs in the background, the
 *                              dashboard follows progress on the campaign row
 */
export async function POST(req: Request) {
  const admin = await adminFromRequest(req);
  if (!admin) return NextResponse.json({ ok: false, error: 'Admin sign-in required.' }, { status: 401 });
  if (!isNewsletterConfigured()) {
    return NextResponse.json({ ok: false, error: 'Email sending is not set up on the server (RESEND_API_KEY missing).' }, { status: 503 });
  }

  const { campaignId, testEmail } = await req.json().catch(() => ({}));
  const { db } = admin;
  const { data: campaign } = await db.from('newsletter_campaigns').select('*').eq('id', campaignId).maybeSingle();
  if (!campaign) return NextResponse.json({ ok: false, error: 'Campaign not found.' }, { status: 404 });
  if (!campaign.subject.trim() || !campaign.content_html.trim()) {
    return NextResponse.json({ ok: false, error: 'Add a subject and content before sending.' }, { status: 400 });
  }
  const contact = await contactInfo();

  if (testEmail) {
    const email = composeEmail({ ...campaign, subject: `[Test] ${campaign.subject}` }, String(testEmail).trim(), undefined, contact);
    const result = await sendOne(email, contact);
    return NextResponse.json(result.ok ? { ok: true } : { ok: false, error: result.error }, { status: result.ok ? 200 : 502 });
  }

  // Claim the campaign so a double click (or two admins) can never send it twice.
  const { data: claimed } = await db
    .from('newsletter_campaigns')
    .update({ status: 'sending', sent_count: 0, failed_count: 0, last_error: null })
    .eq('id', campaign.id)
    .in('status', ['draft', 'failed'])
    .select('id');
  if (!claimed?.length) return NextResponse.json({ ok: false, error: 'This campaign was already sent or is sending.' }, { status: 409 });

  const recipients: { email: string; token: string }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('newsletter_subscribers')
      .select('email, token')
      .eq('status', 'subscribed')
      .order('created_at')
      .range(from, from + 999);
    if (error) {
      await db.from('newsletter_campaigns').update({ status: 'failed', last_error: error.message }).eq('id', campaign.id);
      return NextResponse.json({ ok: false, error: 'Could not load subscribers.' }, { status: 500 });
    }
    recipients.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  if (!recipients.length) {
    await db.from('newsletter_campaigns').update({ status: 'draft' }).eq('id', campaign.id);
    return NextResponse.json({ ok: false, error: 'There are no subscribers yet.' }, { status: 400 });
  }
  await db.from('newsletter_campaigns').update({ recipient_count: recipients.length }).eq('id', campaign.id);

  // Send after the response has gone out (Next.js after(): the request is not held open).
  const emails = recipients.map((r) => composeEmail(campaign, r.email, r.token, contact));
  after(async () => {
    try {
      const result = await sendMany(emails, contact, async (sent, failed, error) => {
        await db.from('newsletter_campaigns').update({ sent_count: sent, failed_count: failed, last_error: error ?? null }).eq('id', campaign.id);
      });
      await db
        .from('newsletter_campaigns')
        .update({
          status: result.sent > 0 ? 'sent' : 'failed',
          sent_at: new Date().toISOString(),
          sent_count: result.sent,
          failed_count: result.failed,
          last_error: result.lastError ?? null,
        })
        .eq('id', campaign.id);
    } catch (e) {
      console.error('[newsletter] send failed:', e);
      await db.from('newsletter_campaigns').update({ status: 'failed', last_error: String(e) }).eq('id', campaign.id);
    }
  });

  return NextResponse.json({ ok: true, recipients: recipients.length }, { status: 202 });
}
