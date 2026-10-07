/**
 * Newsletter sending (server only): Resend API, recipient lists and per-recipient unsubscribe links.
 *
 * Environment (server .env, never NEXT_PUBLIC_):
 *   RESEND_API_KEY      required to send
 *   NEWSLETTER_FROM     sender, e.g. "Mr.Bedmed <newsletter@mrbedmed.com>" (domain verified in Resend)
 *   NEWSLETTER_REPLY_TO optional reply-to address (defaults to the email in Dashboard → Contact Info)
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { SITE_URL } from '@/lib/site';
import { defaultContactInfo, type ContactInfo } from '@/lib/contactInfo';
import { renderNewsletterEmail } from '@/lib/newsletterEmail';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const RESEND_URL = 'https://api.resend.com';

export const newsletterConfig = () => ({
  apiKey: process.env.RESEND_API_KEY || '',
  from: process.env.NEWSLETTER_FROM || 'Mr.Bedmed <newsletter@mrbedmed.com>',
  replyTo: process.env.NEWSLETTER_REPLY_TO || '',
});

export const isNewsletterConfigured = () => !!newsletterConfig().apiKey;

/** Supabase client acting as the visitor (anon) or, with a token, as the signed-in user (RLS applies). */
export function supabaseAs(accessToken?: string): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}

/** The signed-in admin behind a request (Authorization: Bearer <access token>), or null. */
export async function adminFromRequest(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const db = supabaseAs(token);
  const { data: userData } = await db.auth.getUser(token);
  const user = userData?.user;
  if (!user) return null;
  const { data: isAdmin } = await db.rpc('has_role', { _user_id: user.id, _role: 'admin' });
  return isAdmin ? { user, db } : null;
}

export const unsubscribeUrl = (token: string) => `${SITE_URL}/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
const oneClickUrl = (token: string) => `${SITE_URL}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;

export async function contactInfo(): Promise<ContactInfo> {
  const { data } = await supabaseAs().from('site_settings').select('value').eq('key', 'contact_info').maybeSingle();
  return { ...defaultContactInfo, ...((data?.value as Partial<ContactInfo> | null) ?? {}) };
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Unsubscribe token: adds List-Unsubscribe headers (one-click unsubscribe in Gmail/Yahoo/Apple Mail). */
  token?: string;
}

/** Build the email for one recipient. */
export function composeEmail(
  campaign: { subject: string; preheader?: string | null; content_html: string },
  to: string,
  token: string | undefined,
  contact: ContactInfo,
): OutgoingEmail {
  const { html, text } = renderNewsletterEmail({
    subject: campaign.subject,
    preheader: campaign.preheader,
    contentHtml: campaign.content_html,
    unsubscribeUrl: token ? unsubscribeUrl(token) : `${SITE_URL}/newsletter/unsubscribe`,
    siteUrl: SITE_URL,
    addressLines: [contact.address_line1, contact.address_line2].filter(Boolean) as string[],
    phone: contact.phone,
    email: contact.email,
  });
  return { to, subject: campaign.subject, html, text, token };
}

function toResend(email: OutgoingEmail, replyTo: string) {
  const { from } = newsletterConfig();
  return {
    from,
    to: [email.to],
    subject: email.subject,
    html: email.html,
    text: email.text,
    ...(replyTo ? { reply_to: replyTo } : {}),
    ...(email.token
      ? {
          headers: {
            'List-Unsubscribe': `<${oneClickUrl(email.token)}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        }
      : {}),
  };
}

async function resend(path: string, body: unknown): Promise<{ ok: boolean; error?: string }> {
  const { apiKey } = newsletterConfig();
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY is not set on the server.' };
  const res = await fetch(`${RESEND_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.ok) return { ok: true };
  const detail = await res.json().catch(() => null);
  return { ok: false, error: `Resend ${res.status}: ${detail?.message || detail?.name || res.statusText}` };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const EMAIL = /^[^@\s<>"',;]+@[^@\s<>"',;]+\.[^@\s<>"',;]+$/;

/** A usable address from a setting: trims spaces/quotes, accepts "Name <a@b.co>"; '' if not an email. */
export function cleanEmail(value: string | null | undefined): string {
  // Copy-pasted addresses often carry invisible characters (zero-width space, BOM, CR).
  const v = (value || '').replace(/[​-‍⁠﻿\r]/g, '').trim().replace(/^["']+|["']+$/g, '').trim();
  const angle = /<([^>]+)>/.exec(v);
  const addr = (angle ? angle[1] : v).trim();
  return EMAIL.test(addr) ? addr : '';
}

/**
 * Reply-to: NEWSLETTER_REPLY_TO, else the email in Dashboard → Contact Info. An invalid value is
 * skipped (Resend rejects the whole send otherwise) and logged so it can be fixed.
 */
export function replyToAddress(contact?: ContactInfo): string {
  const configured = newsletterConfig().replyTo;
  const fromEnv = cleanEmail(configured);
  if (configured && !fromEnv) console.error(`[newsletter] NEWSLETTER_REPLY_TO is not a valid email (${JSON.stringify(configured)}); using Contact Info instead`);
  return fromEnv || cleanEmail(contact?.email);
}

export async function sendOne(email: OutgoingEmail, contact?: ContactInfo) {
  return resend('/emails', toResend(email, replyToAddress(contact)));
}

/**
 * Send to many recipients through Resend's batch endpoint (100 emails per call), pacing calls to
 * stay under the default rate limit (2 requests/second). Retries a batch once after a 429.
 */
export async function sendMany(
  emails: OutgoingEmail[],
  contact: ContactInfo,
  onProgress?: (sent: number, failed: number, error?: string) => Promise<void> | void,
) {
  const replyTo = replyToAddress(contact);
  let sent = 0;
  let failed = 0;
  let lastError: string | undefined;
  for (let i = 0; i < emails.length; i += 100) {
    const chunk = emails.slice(i, i + 100);
    let result = await resend('/emails/batch', chunk.map((e) => toResend(e, replyTo)));
    if (!result.ok && /Resend 429/.test(result.error || '')) {
      await sleep(2000);
      result = await resend('/emails/batch', chunk.map((e) => toResend(e, replyTo)));
    }
    if (result.ok) sent += chunk.length;
    else {
      failed += chunk.length;
      lastError = result.error;
    }
    await onProgress?.(sent, failed, lastError);
    if (i + 100 < emails.length) await sleep(600);
  }
  return { sent, failed, lastError };
}
