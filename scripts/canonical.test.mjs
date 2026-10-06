import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { idAliases, buildMap } from './redirect-map.mjs';

const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'scripts/setup-nginx-canonical.sh'), 'utf8');

// Extract the exact map rule nginx will use, and emulate it (PCRE and JS agree on this syntax).
const [, pattern, template] = /"~(\^\(\?<mrbedmed_cpath>[^"]+)" '([^']+)';/.exec(script);
const nginxRegex = new RegExp(pattern);
const canonicalTag = (requestUri) => {
  const m = nginxRegex.exec(requestUri);
  return m ? template.replace('$mrbedmed_cpath', m.groups.mrbedmed_cpath) : '';
};

describe('nginx canonical rule (setup-nginx-canonical.sh)', () => {
  it.each([
    ['/', 'https://mrbedmed.com/'],
    ['/products', 'https://mrbedmed.com/products'],
    ['/products/', 'https://mrbedmed.com/products'],
    ['/products/stryker-2141-hospital-bed', 'https://mrbedmed.com/products/stryker-2141-hospital-bed'],
    ['/services/equipment-rental?utm_source=google&x=1', 'https://mrbedmed.com/services/equipment-rental'],
    ['/blog/hospital-bed-sale-in-dallas-tx', 'https://mrbedmed.com/blog/hospital-bed-sale-in-dallas-tx'],
    ['/category/icu-beds//', 'https://mrbedmed.com/category/icu-beds'],
    ['/search/caf%C3%A9', 'https://mrbedmed.com/search/caf%C3%A9'],
  ])('%s → %s', (uri, href) => {
    expect(canonicalTag(uri)).toBe(`<link rel="canonical" href="${href}" />`);
  });

  it.each(['/x"><script>alert(1)</script>', "/x'onmouseover=alert(1)", '/a b', '/<b>', 'products'])(
    'never emits a tag for unsafe request %s (no HTML injection)',
    (uri) => expect(canonicalTag(uri)).toBe(''),
  );

  it('always uses https and the non-www domain', () => {
    expect(template).toContain('href="https://mrbedmed.com$mrbedmed_cpath"');
  });

  it('replaces the placeholder that index.html contains, exactly once, inside <head>', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const placeholder = /PLACEHOLDER='([^']+)'/.exec(script)[1];
    expect(html.split(placeholder)).toHaveLength(2);
    expect(html.indexOf(placeholder)).toBeLessThan(html.indexOf('</head>'));
    expect(html).not.toMatch(/<link rel="canonical"/); // no static tag that would be wrong for inner pages
  });
});

describe('ID URLs redirect to slug URLs (so the canonical is never the ID version)', () => {
  const aliases = idAliases([
    { prefix: '/products/', id: '059b8ada-b15f-4c96-a573-bbee764b6b3c', slug: 'low-air-loss-burn-bed' },
    { prefix: '/blog/', id: '11111111-2222-3333-4444-555555555555', slug: 'hospital-bed-sale-in-dallas-tx' },
    { prefix: '/part/', id: 'aaaa', slug: null },
    { prefix: '/part/', id: 'bbbb', slug: 'Legacy_Slug' },
  ]);

  it('maps /products/{id} and /blog/{id} to their slugs; skips missing/legacy slugs', () => {
    expect(aliases.map((a) => [a.from_path, a.to_path])).toEqual([
      ['/products/059b8ada-b15f-4c96-a573-bbee764b6b3c', '/products/low-air-loss-burn-bed'],
      ['/blog/11111111-2222-3333-4444-555555555555', '/blog/hospital-bed-sale-in-dallas-tx'],
    ]);
  });

  it('explicit redirects win over ID aliases for the same URL', () => {
    const map = buildMap(
      [...aliases, { from_path: '/products/059b8ada-b15f-4c96-a573-bbee764b6b3c', to_path: '/products/other' }],
      [],
    );
    expect(map).toContain('"/products/059b8ada-b15f-4c96-a573-bbee764b6b3c" "/products/other";');
    expect(map).not.toContain('"/products/059b8ada-b15f-4c96-a573-bbee764b6b3c" "/products/low-air-loss-burn-bed";');
  });
});
