/**
 * ALT text convention (DB columns and arrays):
 *   null / undefined → not entered yet → the site falls back to the item's name
 *   ''               → marked "Decorative image" → output alt=""
 *   'text'           → used as-is
 */

export const isDecorative = (alt: string | null | undefined) => alt === '';

/** The ALT attribute to output on the site. */
export function resolveAlt(alt: string | null | undefined, fallback: string): string {
  if (alt === '') return '';
  const text = alt?.trim();
  return text || fallback;
}

/** True when an image still needs ALT text (decorative counts as answered). */
export function isAltMissing(alt: string | null | undefined): boolean {
  if (alt === '') return false;
  return !alt?.trim();
}

/** Normalise form state for saving: keeps '' (decorative), trims text, empty → null. */
export function altForSave(alt: string | null | undefined): string | null {
  if (alt === '') return '';
  return alt?.trim() || null;
}

/** <img> tags in rich-text HTML that have no alt attribute at all (alt="" is decorative, so fine). */
export function countImagesMissingAlt(html: string | null | undefined): number {
  if (!html || !/<img/i.test(html)) return 0;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return [...doc.querySelectorAll('img')].filter((img) => !img.hasAttribute('alt') || (img.getAttribute('alt') !== '' && !img.getAttribute('alt')!.trim())).length;
}

export function missingAltMessage(count: number, what = 'image'): string {
  return `Add ALT text (or tick "Decorative image") for ${count} ${what}${count === 1 ? '' : 's'} before saving.`;
}
