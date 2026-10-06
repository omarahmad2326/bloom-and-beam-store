export const SLUG_MAX_LENGTH = 75;

/** Same rule the database enforces (see validate_slug trigger). */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Turn any text into a URL slug: lowercase a–z, 0–9 and hyphens only.
 * Spaces become hyphens, every other character is removed, max 75 characters.
 *
 * Pass `{ trimEdges: false }` while the user is typing in the slug field so a
 * trailing hyphen ("test-") is not swallowed mid-word.
 */
export function slugify(input: string, { trimEdges = true }: { trimEdges?: boolean } = {}): string {
  let slug = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // é -> e
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .slice(0, SLUG_MAX_LENGTH);

  if (trimEdges) slug = slug.replace(/-+$/, '');
  return slug;
}

export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= SLUG_MAX_LENGTH && SLUG_PATTERN.test(slug);
}

/** @deprecated use slugify */
export const generateSlug = (name: string) => slugify(name);
