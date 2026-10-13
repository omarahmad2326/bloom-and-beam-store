/**
 * Media library addresses: images live in Supabase Storage but are linked through the site's own
 * domain (better for Google Images and back links), e.g.
 *   https://mrbedmed.com/media/stryker-1007-stretcher.webp        (Dashboard → Media Library)
 *   https://mrbedmed.com/media/products/1782155899816-xabsm.png    (images uploaded elsewhere)
 * /media/... is served by src/app/media/[...path]/route.ts.
 */
import { SITE_URL } from '@/lib/site';

/** Library uploads go here; their address is /media/<file name>. */
export const LIBRARY_BUCKET = 'site-images';
export const LIBRARY_FOLDER = 'library';

/** /media/<key>/... → storage bucket. */
export const MEDIA_FOLDERS = {
  products: 'product-images',
  blog: 'blog-images',
  site: 'site-images',
  parts: 'parts-images',
} as const;
export type MediaFolderKey = keyof typeof MEDIA_FOLDERS;

const SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const keyOfBucket = (bucket: string) =>
  (Object.entries(MEDIA_FOLDERS).find(([, b]) => b === bucket)?.[0] as MediaFolderKey | undefined);

/** Site-relative address (/media/...) of a stored file, or null if the bucket is not exposed. */
export function mediaPath(bucket: string, path: string): string | null {
  const clean = path.replace(/^\/+/, '');
  if (!clean.split('/').every((s) => SEGMENT.test(s))) return null;
  if (bucket === LIBRARY_BUCKET && clean.startsWith(`${LIBRARY_FOLDER}/`) && !clean.slice(LIBRARY_FOLDER.length + 1).includes('/')) {
    return `/media/${clean.slice(LIBRARY_FOLDER.length + 1)}`;
  }
  const key = keyOfBucket(bucket);
  return key ? `/media/${key}/${clean}` : null;
}

/** Absolute address on the site's domain. */
export const mediaUrl = (bucket: string, path: string) => {
  const p = mediaPath(bucket, path);
  return p ? `${SITE_URL}${p}` : null;
};

/** /media/... path segments → { bucket, path } in storage, or null for anything else. */
export function storageLocation(segments: string[]): { bucket: string; path: string } | null {
  if (!segments.length || !segments.every((s) => SEGMENT.test(s) && s !== '..')) return null;
  if (segments.length === 1) return { bucket: LIBRARY_BUCKET, path: `${LIBRARY_FOLDER}/${segments[0]}` };
  const bucket = MEDIA_FOLDERS[segments[0] as MediaFolderKey];
  return bucket ? { bucket, path: segments.slice(1).join('/') } : null;
}

/**
 * A Supabase public storage URL (…/storage/v1/object/public/<bucket>/<path>) as the site address;
 * other URLs are returned unchanged.
 */
export function toSiteMediaUrl(url: string, { absolute = true } = {}): string {
  const m = /\/storage\/v1\/object\/public\/([^/]+)\/([^?#]+)/.exec(url);
  if (!m) return url;
  const p = mediaPath(m[1], decodeURIComponent(m[2]));
  if (!p) return url;
  return absolute ? `${SITE_URL}${p}` : p;
}

export const isImageName = (name: string) => /\.(webp|png|jpe?g|gif|svg|avif)$/i.test(name);

export const formatBytes = (n?: number | null) =>
  !n ? '—' : n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
