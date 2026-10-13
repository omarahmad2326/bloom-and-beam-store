/** Dashboard → Media Library: list, upload and delete images (browser, signed-in admin). */
import { supabase } from '@/integrations/supabase/client';
import { uploadImage } from '@/lib/imageUpload';
import { LIBRARY_BUCKET, LIBRARY_FOLDER, MEDIA_FOLDERS, isImageName, mediaPath, toSiteMediaUrl, type MediaFolderKey } from '@/lib/media';
import { SITE_URL } from '@/lib/site';

export type MediaSource = 'library' | MediaFolderKey;

export const MEDIA_SOURCES: { key: MediaSource; label: string }[] = [
  { key: 'library', label: 'Media Library' },
  { key: 'products', label: 'Products' },
  { key: 'blog', label: 'Blog' },
  { key: 'parts', label: 'Parts' },
  { key: 'site', label: 'Site images' },
];

export interface MediaItem {
  name: string;
  bucket: string;
  path: string;
  /** Site-relative address, e.g. /media/stryker-1007.webp */
  relUrl: string;
  /** Absolute address on the domain, e.g. https://mrbedmed.com/media/stryker-1007.webp */
  url: string;
  size: number | null;
  createdAt: string | null;
  source: MediaSource;
}

type Entry = { name: string; id: string | null; created_at?: string | null; metadata?: { size?: number } | null };

async function listFolder(bucket: string, prefix: string, depth: number, skip: string[] = []): Promise<{ path: string; e: Entry }[]> {
  const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } });
  if (error) throw error;
  const out: { path: string; e: Entry }[] = [];
  for (const e of (data || []) as Entry[]) {
    const path = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.id === null) {
      // A folder.
      if (depth > 0 && !skip.includes(path)) out.push(...(await listFolder(bucket, path, depth - 1)));
    } else if (isImageName(e.name)) {
      out.push({ path, e });
    }
  }
  return out;
}

/** Images of one source, newest first. */
export async function listMedia(source: MediaSource): Promise<MediaItem[]> {
  const bucket = source === 'library' ? LIBRARY_BUCKET : MEDIA_FOLDERS[source];
  const files =
    source === 'library'
      ? await listFolder(LIBRARY_BUCKET, LIBRARY_FOLDER, 0)
      : await listFolder(bucket, '', 2, source === 'site' ? [LIBRARY_FOLDER] : []);
  return files
    .map(({ path, e }): MediaItem | null => {
      const rel = mediaPath(bucket, path);
      return rel
        ? { name: e.name, bucket, path, relUrl: rel, url: `${SITE_URL}${rel}`, size: e.metadata?.size ?? null, createdAt: e.created_at ?? null, source }
        : null;
    })
    .filter((x): x is MediaItem => !!x)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

/** Upload to the Media Library; returns the domain address (/media/<file name>). */
export async function uploadToLibrary(file: File, nameBase?: string): Promise<string> {
  const storageUrl = await uploadImage(LIBRARY_BUCKET, file, { nameBase, folder: LIBRARY_FOLDER });
  return toSiteMediaUrl(storageUrl);
}

export async function deleteMedia(item: Pick<MediaItem, 'bucket' | 'path'>) {
  const { error } = await supabase.storage.from(item.bucket).remove([item.path]);
  if (error) throw error;
}
