import { describe, expect, it } from 'vitest';
import { absolutizeUrls, htmlToPlainText, renderNewsletterEmail } from './newsletterEmail';
import { subscribersCsv } from './newsletterAdmin';
import { timeLeft } from './recentlyDeleted';

const base = {
  subject: 'New stretchers <in stock>',
  preheader: 'Refurbished Stryker units',
  contentHtml: '<h2>Hello</h2><p>See <a href="/products/stryker-1007-stretcher">the Stryker 1007</a>.</p><img src="/images/x.png" alt="x">',
  unsubscribeUrl: 'https://mrbedmed.com/newsletter/unsubscribe?token=abc',
  siteUrl: 'https://mrbedmed.com',
  addressLines: ['555 N. 5th St, Suite 109', 'Garland, TX 75040'],
  phone: '+1 469 767 8853',
  email: 'service@mbmts.com',
};

describe('newsletter email', () => {
  const { html, text } = renderNewsletterEmail(base);

  it('makes site links and images absolute', () => {
    expect(html).toContain('href="https://mrbedmed.com/products/stryker-1007-stretcher"');
    expect(html).toContain('src="https://mrbedmed.com/images/x.png"');
    expect(absolutizeUrls('<a href="//cdn.x/y">', 'https://mrbedmed.com')).toBe('<a href="//cdn.x/y">');
  });

  it('has the unsubscribe link, postal address and preheader (CAN-SPAM)', () => {
    expect(html).toContain('href="https://mrbedmed.com/newsletter/unsubscribe?token=abc"');
    expect(html).toContain('555 N. 5th St, Suite 109, Garland, TX 75040');
    expect(html).toContain('Refurbished Stryker units');
    expect(text).toContain('Unsubscribe: https://mrbedmed.com/newsletter/unsubscribe?token=abc');
  });

  it('escapes the subject in the title', () => {
    expect(html).toContain('<title>New stretchers &lt;in stock&gt;</title>');
  });

  it('inlines styles on content tags', () => {
    expect(html).toMatch(/<p style="margin:0 0 16px;/);
    expect(html).toMatch(/<h2 style="/);
  });

  it('plain-text version keeps links readable', () => {
    expect(text).toContain('See the Stryker 1007 (https://mrbedmed.com/products/stryker-1007-stretcher).');
    expect(htmlToPlainText('<ul><li>One</li><li>Two &amp; three</li></ul>')).toBe('• One\n• Two & three');
  });
});

describe('subscriber CSV export', () => {
  it('quotes values and neutralises spreadsheet formulas', () => {
    const csv = subscribersCsv([
      { email: 'a@b.co', status: 'subscribed', created_at: '2026-10-07', source: '=HYPERLINK("x")', unsubscribed_at: null },
    ]);
    expect(csv).toBe('email,status,signed_up,source,unsubscribed_at\r\n"a@b.co","subscribed","2026-10-07","\'=HYPERLINK(""x"")",""\r\n');
  });
});

describe('Recently Deleted time left', () => {
  const now = Date.parse('2026-10-08T12:00:00Z');
  it.each([
    ['2026-10-08T12:00:00Z', '7 days left'],
    ['2026-10-02T12:00:00Z', '1 day left'],
    ['2026-10-01T15:00:00Z', '3 hours left'],
    ['2026-10-01T12:30:00Z', 'under 1 hour left'],
  ])('%s → %s', (deletedAt, label) => {
    expect(timeLeft(deletedAt, now)).toBe(label);
  });
});
