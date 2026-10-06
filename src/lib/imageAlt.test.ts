import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { altForSave, countImagesMissingAlt, isAltMissing, resolveAlt } from './imageAlt';
import { uploadFileName, toWebP } from './imageUpload';

describe('ALT text convention', () => {
  it('resolves: text as-is, decorative → "", missing → item name', () => {
    expect(resolveAlt('Stryker 1115 Prime stretcher, side rails up', 'Stryker 1115')).toBe('Stryker 1115 Prime stretcher, side rails up');
    expect(resolveAlt('', 'Stryker 1115')).toBe('');
    expect(resolveAlt(null, 'Stryker 1115')).toBe('Stryker 1115');
    expect(resolveAlt(undefined, 'Stryker 1115')).toBe('Stryker 1115');
    expect(resolveAlt('   ', 'Stryker 1115')).toBe('Stryker 1115');
  });

  it('treats decorative as answered, blank/null as missing', () => {
    expect(isAltMissing('')).toBe(false);
    expect(isAltMissing('Side view')).toBe(false);
    expect(isAltMissing(null)).toBe(true);
    expect(isAltMissing('  ')).toBe(true);
  });

  it('normalises for saving', () => {
    expect(altForSave('  Side view ')).toBe('Side view');
    expect(altForSave('')).toBe('');
    expect(altForSave('   ')).toBeNull();
    expect(altForSave(null)).toBeNull();
  });

  it('counts images in rich text without an alt attribute (alt="" is fine)', () => {
    expect(countImagesMissingAlt('<p>x</p>')).toBe(0);
    expect(countImagesMissingAlt('<img src="a.png" alt="A"><img src="b.png" alt=""><img src="c.png">')).toBe(1);
    expect(countImagesMissingAlt('<img src="a.png" alt="  ">')).toBe(1);
  });
});

describe('upload file names', () => {
  const file = (name: string, type: string) => new File(['x'], name, { type });
  it('names files from the slug, with -2, -3 for duplicates', () => {
    expect(uploadFileName('stryker-1115-prime-stretcher', file('IMG_0042.webp', 'image/webp'))).toBe('stryker-1115-prime-stretcher.webp');
    expect(uploadFileName('Stryker 1115 Prime Stretcher', file('a.webp', 'image/webp'), 3)).toBe('stryker-1115-prime-stretcher-3.webp');
  });
  it('falls back to the original file name when there is no slug yet', () => {
    expect(uploadFileName('', file('Side View (1).PNG', 'image/png'))).toBe('side-view-1.png');
  });
  it('keeps the original when WebP conversion is unavailable', async () => {
    const f = file('a.png', 'image/png');
    expect(await toWebP(f)).toBe(f);
    const gif = file('anim.gif', 'image/gif');
    expect(await toWebP(gif)).toBe(gif);
  });
});
