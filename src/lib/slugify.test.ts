import { describe, expect, it } from 'vitest';
import { slugify, isValidSlug, SLUG_MAX_LENGTH } from './slugify';

describe('slugify', () => {
  it('turns "Test Bed 2" into test-bed-2', () => {
    expect(slugify('Test Bed 2')).toBe('test-bed-2');
  });

  it('keeps only lowercase a-z, 0-9 and hyphens', () => {
    expect(slugify('Stryker 1007 (SM104) M-Series!')).toBe('stryker-1007-sm104-m-series');
    expect(slugify('Repair & Maintenance')).toBe('repair-maintenance');
    expect(slugify('Café Bed')).toBe('cafe-bed');
    expect(slugify('under_score')).toBe('underscore');
  });

  it('collapses and trims hyphens', () => {
    expect(slugify('  --Hello   World--  ')).toBe('hello-world');
  });

  it('caps length at 75 characters without a trailing hyphen', () => {
    const slug = slugify('word '.repeat(40));
    expect(slug.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('keeps a trailing hyphen while typing', () => {
    expect(slugify('test ', { trimEdges: false })).toBe('test-');
  });

  it('never appends a counter', () => {
    expect(slugify('Test Bed')).toBe('test-bed');
  });
});

describe('isValidSlug', () => {
  it('matches the database rule', () => {
    expect(isValidSlug('test-bed-2')).toBe(true);
    expect(isValidSlug('Test-Bed')).toBe(false);
    expect(isValidSlug('a--b')).toBe(false);
    expect(isValidSlug('-a')).toBe(false);
    expect(isValidSlug('')).toBe(false);
    expect(isValidSlug('a'.repeat(76))).toBe(false);
  });
});
