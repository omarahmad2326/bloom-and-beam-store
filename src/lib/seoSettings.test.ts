import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SEO_SETTINGS, buildLlmsTxt, cleanClarityId, cleanGaId, cleanVerification, isValidClarityId, isValidGaId,
  isValidVerification, recommendedRobots, robotsTxt, schemaBlockError, schemaBlockHtml, withSeoDefaults,
} from './seoSettings';
import { isPrivatePath } from '@/components/seo/Analytics';

describe('SEO settings defaults', () => {
  it('unsaved settings keep the values the site used before (no change on release)', () => {
    const s = withSeoDefaults(null);
    expect(s.google_verification).toBe('cwYTQFNoWwxVD-Buidhtv_iL6rciP1ha2qanxMgfLng');
    expect(s.ga_id).toBe('G-N6VD2Z798P');
    expect(s.clarity_id).toBe('x8j4k2099m');
    expect(s.schema_blocks).toHaveLength(1);
    expect(schemaBlockError(s.schema_blocks[0].json)).toBeNull();
  });

  it('an admin can turn a tool off with an empty value', () => {
    expect(withSeoDefaults({ ga_id: '', bing_verification: '' }).ga_id).toBe('');
  });
});

describe('input clean-up', () => {
  it('takes the code out of a pasted verification meta tag', () => {
    expect(cleanVerification('<meta name="google-site-verification" content="abc_DEF-123456" />')).toBe('abc_DEF-123456');
    expect(cleanVerification("  <meta name='msvalidate.01' content='9F1E2D3C4B5A69788796A5B4C3D2E1F0' /> ")).toBe('9F1E2D3C4B5A69788796A5B4C3D2E1F0');
    expect(isValidVerification('has space')).toBe(false);
  });
  it('normalises analytics ids', () => {
    expect(cleanGaId(' g-n6vd2z798p ')).toBe('G-N6VD2Z798P');
    expect(isValidGaId('UA-1234-1')).toBe(false);
    expect(cleanClarityId('https://www.clarity.ms/tag/X8J4K2099M')).toBe('x8j4k2099m');
    expect(isValidClarityId('x8j4k2099m')).toBe(true);
  });
});

describe('schema blocks', () => {
  it('accepts JSON-LD with or without the script tag and escapes < for the page', () => {
    const html = schemaBlockHtml('<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"A </script> B"}</script>');
    expect(html).toContain('"@type": "Organization"');
    expect(html).not.toContain('</script>');
  });
  it('rejects broken blocks', () => {
    expect(schemaBlockError('{ "@type": ')).toMatch(/Not valid JSON/);
    expect(schemaBlockError('{"name":"x"}')).toMatch(/@type/);
    expect(schemaBlockError('[1]')).toMatch(/JSON object/);
    expect(schemaBlockHtml('nope')).toBeNull();
  });
});

describe('robots.txt', () => {
  const txt = recommendedRobots('https://mrbedmed.com');
  it('allows the site, keeps private pages out, blocks AI training, points to the sitemap', () => {
    for (const line of ['Allow: /', 'Disallow: /admin', 'Disallow: /auth', 'Disallow: /cart', 'Disallow: /checkout', 'Disallow: /account', 'Disallow: /orders', 'Disallow: /api/'])
      expect(txt).toContain(line);
    expect(txt).toMatch(/User-agent: GPTBot\nDisallow: \//);
    expect(txt).toContain('Sitemap: https://mrbedmed.com/sitemap.xml');
  });
  it('custom text replaces it; empty custom falls back to recommended', () => {
    expect(robotsTxt({ ...DEFAULT_SEO_SETTINGS, robots_mode: 'custom', robots_custom: 'User-agent: *\nAllow: /' }, 'https://mrbedmed.com')).toBe('User-agent: *\nAllow: /\n');
    expect(robotsTxt({ ...DEFAULT_SEO_SETTINGS, robots_mode: 'custom', robots_custom: ' ' }, 'https://mrbedmed.com')).toBe(txt);
  });
});

describe('llms.txt', () => {
  it('is a Markdown guide with services, categories, posts and contact', () => {
    const txt = buildLlmsTxt({
      siteUrl: 'https://mrbedmed.com',
      name: 'Mr.Bedmed',
      description: 'Hospital beds and stretchers in Texas.',
      contact: { phone: '+1 469 767 8853', email: 'info@mrbedmed.com', address: 'Garland, TX' },
      services: [{ title: 'Equipment Rental', slug: 'equipment-rental', summary: '<p>Short and long term rentals</p>' }],
      categories: [{ name: 'ICU Beds', slug: 'icu-beds' }],
      posts: [{ title: 'What Is an EMS Stretcher', slug: 'what-is-an-ems-stretcher', excerpt: null }],
    });
    expect(txt.startsWith('# Mr.Bedmed\n\n> Hospital beds and stretchers in Texas.')).toBe(true);
    expect(txt).toContain('- [Equipment Rental](https://mrbedmed.com/services/equipment-rental): Short and long term rentals');
    expect(txt).toContain('- [ICU Beds](https://mrbedmed.com/category/icu-beds)');
    expect(txt).toContain('- [What Is an EMS Stretcher](https://mrbedmed.com/blog/what-is-an-ems-stretcher)\n');
    expect(txt).toContain('- Phone: +1 469 767 8853');
  });
});

describe('analytics', () => {
  it.each([['/admin', true], ['/admin/seo', true], ['/auth', true], ['/', false], ['/administration-tips', false], ['/products', false]])(
    '%s private: %s', (path, privatePath) => expect(isPrivatePath(path)).toBe(privatePath),
  );
});
