import { supabase } from '@/integrations/supabase/client';
import { slugify } from '@/lib/slugify';

const CONVERTIBLE = /^image\/(jpeg|png|bmp|tiff)$/i;
const MAX_DIMENSION = 2400;

/**
 * Convert JPEG/PNG to WebP in the browser (smaller files, same quality). GIF (animation),
 * SVG (vector) and existing WebP are kept as-is. Falls back to the original on any failure.
 */
export async function toWebP(file: File, quality = 0.85): Promise<File> {
  if (!CONVERTIBLE.test(file.type) || typeof createImageBitmap !== 'function') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
    if (!blob || blob.type !== 'image/webp' || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
  } catch {
    return file;
  }
}

const extensionOf = (file: File) =>
  (file.type === 'image/webp' ? 'webp' : file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';

/** stryker-1115-prime-stretcher.webp, then -2, -3 … if taken. Falls back to the original file name. */
export function uploadFileName(base: string | undefined, file: File, attempt = 1): string {
  const stem = slugify(base || '') || slugify(file.name.replace(/\.[^.]+$/, '')) || 'image';
  return `${stem}${attempt > 1 ? `-${attempt}` : ''}.${extensionOf(file)}`;
}

/**
 * Upload an image (converted to WebP when useful) under an SEO-friendly name derived from
 * `nameBase` (usually the item's slug). Never overwrites an existing file.
 */
export async function uploadImage(
  bucket: string,
  original: File,
  { nameBase, folder }: { nameBase?: string; folder?: string } = {},
): Promise<string> {
  const file = await toWebP(original);
  for (let attempt = 1; attempt <= 50; attempt++) {
    const path = `${folder ? `${folder}/` : ''}${uploadFileName(nameBase, file, attempt)}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type });
    if (!error) return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    const exists = /exists|duplicate/i.test(error.message) || (error as { statusCode?: string }).statusCode === '409';
    if (!exists) throw error;
  }
  throw new Error('Could not find a free file name for this image');
}
