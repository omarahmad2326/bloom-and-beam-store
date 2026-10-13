import { describe, expect, it } from 'vitest';
import { mediaPath, mediaUrl, storageLocation, toSiteMediaUrl } from './media';

const SB = 'https://xgzjppyfkfjnwdrxpnpz.supabase.co/storage/v1/object/public';

describe('media addresses', () => {
  it('library uploads get /media/<file name> on the domain', () => {
    expect(mediaPath('site-images', 'library/stryker-1007-stretcher.webp')).toBe('/media/stryker-1007-stretcher.webp');
    expect(mediaUrl('site-images', 'library/stryker-1007-stretcher.webp')).toBe('https://mrbedmed.com/media/stryker-1007-stretcher.webp');
  });

  it('other images keep their folder', () => {
    expect(mediaPath('product-images', '1782155899816-xabsm.png')).toBe('/media/products/1782155899816-xabsm.png');
    expect(mediaPath('blog-images', 'content/bed-care.webp')).toBe('/media/blog/content/bed-care.webp');
    expect(mediaPath('site-images', 'hero.jpg')).toBe('/media/site/hero.jpg');
    expect(mediaPath('site-images', 'library/sub/x.webp')).toBe('/media/site/library/sub/x.webp');
    expect(mediaPath('avatars', 'x.png')).toBeNull();
  });

  it('maps addresses back to storage, and nothing else', () => {
    expect(storageLocation(['stryker-1007-stretcher.webp'])).toEqual({ bucket: 'site-images', path: 'library/stryker-1007-stretcher.webp' });
    expect(storageLocation(['products', '1782155899816-xabsm.png'])).toEqual({ bucket: 'product-images', path: '1782155899816-xabsm.png' });
    expect(storageLocation(['blog', 'content', 'a.webp'])).toEqual({ bucket: 'blog-images', path: 'content/a.webp' });
    for (const bad of [[], ['..', 'x.png'], ['products', '..', 'x'], ['secret-bucket', 'x.png'], ['.env'], ['products', 'a b.png']]) {
      expect(storageLocation(bad)).toBeNull();
    }
  });

  it('round-trips: every address points at the same stored file', () => {
    for (const [bucket, path] of [['site-images', 'library/a.webp'], ['parts-images', 'x/y.png'], ['product-images', 'p.jpg']]) {
      const segs = mediaPath(bucket, path)!.replace('/media/', '').split('/');
      expect(storageLocation(segs)).toEqual({ bucket, path });
    }
  });

  it('turns Supabase storage URLs into domain URLs', () => {
    expect(toSiteMediaUrl(`${SB}/site-images/library/a.webp`)).toBe('https://mrbedmed.com/media/a.webp');
    expect(toSiteMediaUrl(`${SB}/product-images/p.png`, { absolute: false })).toBe('/media/products/p.png');
    expect(toSiteMediaUrl('https://example.com/x.png')).toBe('https://example.com/x.png');
  });
});
