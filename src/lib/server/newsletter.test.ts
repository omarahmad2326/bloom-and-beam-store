// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultContactInfo } from '@/lib/contactInfo';
import { composeEmail, sendMany } from './newsletter';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

const campaign = { subject: 'October news', preheader: null, content_html: '<p>Hi</p>' };

describe('newsletter sending', () => {
  it('sends in batches of 100 with one-click unsubscribe headers and the sender from the env', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('NEWSLETTER_FROM', 'Mr.Bedmed <news@mrbedmed.com>');
    const calls: { url: string; body: Array<Record<string, unknown>> }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(String(init.body)) });
      return new Response('{}', { status: 200 });
    }));
    vi.useFakeTimers();

    const emails = Array.from({ length: 250 }, (_, i) =>
      composeEmail(campaign, `user${i}@example.com`, `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`, defaultContactInfo));
    const done = sendMany(emails, defaultContactInfo);
    await vi.runAllTimersAsync();
    const result = await done;

    expect(result).toEqual({ sent: 250, failed: 0, lastError: undefined });
    expect(calls.map((c) => [c.url, c.body.length])).toEqual([
      ['https://api.resend.com/emails/batch', 100],
      ['https://api.resend.com/emails/batch', 100],
      ['https://api.resend.com/emails/batch', 50],
    ]);
    const first = calls[0].body[0] as { from: string; to: string[]; headers: Record<string, string>; reply_to: string; html: string };
    expect(first.from).toBe('Mr.Bedmed <news@mrbedmed.com>');
    expect(first.to).toEqual(['user0@example.com']);
    expect(first.reply_to).toBe(defaultContactInfo.email);
    expect(first.headers['List-Unsubscribe']).toMatch(/^<https:\/\/mrbedmed\.com\/api\/newsletter\/unsubscribe\?token=00000000-/);
    expect(first.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    expect(first.html).toContain('/newsletter/unsubscribe?token=00000000-0000-0000-0000-000000000000');
  });

  it('retries a batch once after a rate limit and reports failures', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    const statuses = [429, 200, 500];
    vi.stubGlobal('fetch', vi.fn(async () => {
      const status = statuses.shift() ?? 200;
      return new Response(JSON.stringify({ message: status === 500 ? 'boom' : '' }), { status });
    }));
    vi.useFakeTimers();
    const emails = Array.from({ length: 150 }, (_, i) => composeEmail(campaign, `u${i}@example.com`, undefined, defaultContactInfo));
    const done = sendMany(emails, defaultContactInfo);
    await vi.runAllTimersAsync();
    expect(await done).toEqual({ sent: 100, failed: 50, lastError: 'Resend 500: boom' });
  });

  it('does not call Resend without an API key', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const result = await sendMany([composeEmail(campaign, 'a@b.co', undefined, defaultContactInfo)], defaultContactInfo);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.failed).toBe(1);
    expect(result.lastError).toMatch(/RESEND_API_KEY/);
  });
});
