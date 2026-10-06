import { describe, expect, it } from 'vitest';
import { normalizeRedirectPath, redirectLookupKeys } from './redirects';

describe('normalizeRedirectPath', () => {
  it('accepts paths and full site URLs', () => {
    expect(normalizeRedirectPath('/products/old')).toBe('/products/old');
    expect(normalizeRedirectPath('products/old/')).toBe('/products/old');
    expect(normalizeRedirectPath('https://mrbedmed.com/products/old/')).toBe('/products/old');
    expect(normalizeRedirectPath('https://www.mrbedmed.com/a?x=1')).toBe('/a?x=1');
  });

  it('rejects other domains as a source but allows them as a target', () => {
    expect(normalizeRedirectPath('https://example.com/x')).toBe('');
    expect(normalizeRedirectPath('https://example.com/x', { allowExternal: true })).toBe('https://example.com/x');
  });
});

describe('redirectLookupKeys', () => {
  it('tries the exact path then lowercase', () => {
    expect(redirectLookupKeys('/category/ICU-bed/')).toEqual(['/category/ICU-bed', '/category/icu-bed']);
    expect(redirectLookupKeys('/products/x')).toEqual(['/products/x']);
  });
});
