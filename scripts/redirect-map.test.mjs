import { describe, expect, it } from 'vitest';
import { buildMap } from './redirect-map.mjs';

/** Parse the generated map and emulate nginx: exact keys (case-insensitive) first, then regexes in order. */
function nginx(mapText) {
  const entries = mapText
    .split('\n')
    .filter((l) => l.startsWith('"'))
    .map((l) => /^"([^"]*)" "([^"]*)";$/.exec(l).slice(1));
  const exact = new Map();
  const regex = [];
  for (const [key, value] of entries) {
    if (key.startsWith('~')) {
      const ci = key.startsWith('~*');
      regex.push([new RegExp(key.slice(ci ? 2 : 1), ci ? 'i' : ''), value]);
    } else {
      if (exact.has(key.toLowerCase())) throw new Error(`conflicting parameter "${key}"`);
      exact.set(key.toLowerCase(), value);
    }
  }
  return (uri) => {
    if (exact.has(uri.toLowerCase())) return exact.get(uri.toLowerCase());
    for (const [re, value] of regex) if (re.test(uri)) return value;
    return '';
  };
}

// Production data as of 2026-10-06.
const redirects = [
  { from_path: '/category/Chair-stretcher', to_path: '/category/chair-stretcher' },
  { from_path: '/category/icu-bed', to_path: '/category/icu-beds' },
  { from_path: '/products/test-bed-2', to_path: '/products/test-bed-two' },
];
const categories = ['icu-beds', 'chair-stretcher', 'wheelchair', 'er-stretcher'].map((slug) => ({ slug }));

describe('nginx redirect map', () => {
  const map = buildMap(redirects, categories);
  const lookup = nginx(map);

  it('has no keys that conflict ignoring case (nginx -t would fail)', () => {
    expect(() => nginx(map)).not.toThrow();
  });

  it.each([
    ['/category/icu-bed', '/category/icu-beds'],
    ['/category/ICU-bed', '/category/icu-beds'],
    ['/category/icu-bed/', '/category/icu-beds'],
    ['/category/ICU-beds', '/category/icu-beds'],
    ['/category/Chair-stretcher', '/category/chair-stretcher'],
    ['/category/WheelChair', '/category/wheelchair'],
    ['/products/test-bed-2', '/products/test-bed-two'],
    ['/products/test-bed-2/', '/products/test-bed-two'],
  ])('%s → %s', (uri, target) => {
    expect(lookup(uri)).toBe(target);
  });

  it.each(['/category/icu-beds', '/category/icu-beds/', '/category/chair-stretcher', '/category/wheelchair', '/products/test-bed-two', '/', '/blog'])(
    'live URL %s is not redirected (no loop)',
    (uri) => expect(lookup(uri)).toBe(''),
  );

  it('never redirects a URL to itself', () => {
    for (const line of map.split('\n').filter((l) => l.startsWith('"/'))) {
      const [, from, to] = /^"([^"]*)" "([^"]*)";$/.exec(line);
      expect(from.replace(/\/$/, '').toLowerCase()).not.toBe(to.toLowerCase());
    }
  });

  it('skips unsafe values that would break nginx', () => {
    const out = buildMap([{ from_path: '/a"b', to_path: '/c' }, { from_path: '/x', to_path: '/$y' }], []);
    expect(out).not.toContain('"/a');
    expect(out).not.toContain('$y');
  });

  it('dedupes keys that differ only in case', () => {
    const out = buildMap([{ from_path: '/Old', to_path: '/a' }, { from_path: '/old', to_path: '/b' }], []);
    expect(() => nginx(out)).not.toThrow();
  });
});
