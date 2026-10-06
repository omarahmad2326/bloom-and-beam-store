/**
 * Newsletter email HTML/text. Used by the server when sending and by the dashboard preview, so the
 * preview is exactly what subscribers get. Email clients ignore most CSS, so the layout is a
 * simple centred table with inline styles.
 */

export interface NewsletterEmailInput {
  subject: string;
  /** Short line shown next to the subject in the inbox. */
  preheader?: string | null;
  contentHtml: string;
  /** Absolute unsubscribe link for this recipient. */
  unsubscribeUrl: string;
  siteUrl: string;
  companyName?: string;
  /** Postal address lines (required in marketing email by CAN-SPAM). */
  addressLines?: string[];
  phone?: string | null;
  email?: string | null;
}

const BRAND = '#0857c3'; // --primary (hsl 217 91% 40%)

export const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Site-relative links and images (/products/x) must be absolute in an email. */
export function absolutizeUrls(html: string, siteUrl: string): string {
  const origin = siteUrl.replace(/\/+$/, '');
  return html.replace(/\b(href|src)=(["'])\/(?!\/)/gi, (_m, attr, q) => `${attr}=${q}${origin}/`);
}

/** Inline styles for the tags the editor produces (most email clients drop <style> blocks). */
function styleContent(html: string): string {
  const styles: Record<string, string> = {
    p: 'margin:0 0 16px;font-size:16px;line-height:1.6;color:#1f2937;',
    h2: 'margin:28px 0 12px;font-size:22px;line-height:1.3;color:#111827;',
    h3: 'margin:24px 0 10px;font-size:18px;line-height:1.3;color:#111827;',
    ul: 'margin:0 0 16px;padding-left:22px;color:#1f2937;',
    ol: 'margin:0 0 16px;padding-left:22px;color:#1f2937;',
    li: 'margin:0 0 6px;font-size:16px;line-height:1.6;',
    a: `color:${BRAND};text-decoration:underline;`,
    img: 'max-width:100%;height:auto;border:0;display:block;margin:0 auto 16px;',
    blockquote: `margin:0 0 16px;padding:4px 0 4px 14px;border-left:3px solid ${BRAND};color:#4b5563;`,
    table: 'border-collapse:collapse;width:100%;margin:0 0 16px;',
    th: 'border:1px solid #d1d5db;padding:8px;text-align:left;background:#f3f4f6;font-size:14px;',
    td: 'border:1px solid #d1d5db;padding:8px;font-size:14px;',
  };
  return html.replace(/<(p|h2|h3|ul|ol|li|a|img|blockquote|table|th|td)(\s[^>]*)?>/gi, (m, tag: string, attrs = '') => {
    const css = styles[tag.toLowerCase()];
    if (/\sstyle=/i.test(attrs)) return m;
    return `<${tag}${attrs} style="${css}">`;
  });
}

export function renderNewsletterEmail(input: NewsletterEmailInput): { html: string; text: string } {
  const company = input.companyName || 'Mr.Bedmed';
  const site = input.siteUrl.replace(/\/+$/, '');
  const body = styleContent(absolutizeUrls(input.contentHtml || '', site));
  const address = (input.addressLines || []).map((l) => l?.trim()).filter(Boolean) as string[];
  const contactBits = [input.phone?.trim(), input.email?.trim()].filter(Boolean) as string[];
  const preheader = input.preheader?.trim() || '';

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${escapeHtml(input.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
      <tr><td style="background:${BRAND};padding:20px 28px;">
        <a href="${site}/" style="color:#ffffff;text-decoration:none;font-size:22px;font-weight:bold;">${escapeHtml(company)}</a>
      </td></tr>
      <tr><td style="padding:28px;">${body}</td></tr>
      <tr><td style="padding:20px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.6;color:#6b7280;">
        <p style="margin:0 0 6px;"><strong>${escapeHtml(company)}</strong>${address.length ? ' · ' + address.map(escapeHtml).join(', ') : ''}</p>
        ${contactBits.length ? `<p style="margin:0 0 6px;">${contactBits.map(escapeHtml).join(' · ')}</p>` : ''}
        <p style="margin:0;">You are receiving this because you subscribed at <a href="${site}/" style="color:#6b7280;">${escapeHtml(site.replace(/^https?:\/\//, ''))}</a>.
        <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const text = [
    preheader,
    htmlToPlainText(absolutizeUrls(input.contentHtml || '', site)),
    '',
    '—',
    [company, ...address].join(', '),
    contactBits.join(' · '),
    `Unsubscribe: ${input.unsubscribeUrl}`,
  ]
    .filter((l, i) => l || i > 1)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { html, text };
}

/** Readable plain-text version (links kept as "text (url)"). */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href, label) => {
      const text = label.replace(/<[^>]+>/g, '').trim();
      return text && text !== href ? `${text} (${href})` : href;
    })
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/(p|h[1-6]|ul|ol|blockquote|tr|table)>/gi, '\n')
    .replace(/<\/li>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export const WELCOME_SUBJECT = 'Welcome to the Mr.Bedmed newsletter';
export const WELCOME_HTML = `<h2>Thanks for subscribing!</h2>
<p>You will now receive occasional updates from Mr.Bedmed: new and refurbished hospital beds and stretchers, parts, service tips and offers for healthcare facilities across Texas.</p>
<p>In the meantime, <a href="/products">browse our equipment</a> or <a href="/contact-us">contact us</a> for a quote.</p>`;
