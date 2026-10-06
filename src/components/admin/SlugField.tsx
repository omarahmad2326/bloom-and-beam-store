import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, AlertCircle, CornerDownRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { slugify, isValidSlug, SLUG_MAX_LENGTH } from '@/lib/slugify';
import { isReservedPageSlug, RESERVED_SLUG_MESSAGE } from '@/lib/sitePages';

export type SlugTable = 'products' | 'parts' | 'categories' | 'services' | 'blog_posts' | 'site_pages';

export const SLUG_PATH_PREFIX: Record<SlugTable, string> = {
  products: '/products/',
  parts: '/part/',
  categories: '/category/',
  services: '/services/',
  blog_posts: '/blog/',
  site_pages: '/',
};

export const SLUG_TAKEN_MESSAGE = 'This slug is already used.';
const SLUG_FORMAT_MESSAGE = `Use only lowercase letters a–z, numbers 0–9 and hyphens (max ${SLUG_MAX_LENGTH} characters).`;

export async function isSlugAvailable(table: SlugTable, slug: string, excludeId?: string | null): Promise<boolean> {
  let query = supabase.from(table).select('id').eq('slug', slug).limit(1);
  if (excludeId) query = query.neq('id', excludeId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).length === 0;
}

/**
 * Authoritative check before saving. Returns an error message, or null when the slug can be saved.
 * Never appends "-1": a taken slug is an error the admin must resolve.
 */
export async function validateSlugForSave(
  table: SlugTable,
  slug: string,
  { excludeId, originalSlug }: { excludeId?: string | null; originalSlug?: string | null } = {},
): Promise<string | null> {
  if (!slug) return 'Slug is required.';
  // Legacy slugs that predate the format rules stay valid until they are changed.
  if (slug !== originalSlug && !isValidSlug(slug)) return SLUG_FORMAT_MESSAGE;
  if (table === 'site_pages' && isReservedPageSlug(slug)) return RESERVED_SLUG_MESSAGE;
  try {
    if (!(await isSlugAvailable(table, slug, excludeId))) return SLUG_TAKEN_MESSAGE;
  } catch {
    return 'Could not verify the slug. Please try again.';
  }
  return null;
}

/** Maps database errors from a save to a user-facing slug message, if applicable. */
export function slugErrorFromDb(error: { code?: string; message?: string } | null): string | null {
  if (!error) return null;
  if (error.code === '23505' && /slug/i.test(error.message || '')) return SLUG_TAKEN_MESSAGE;
  if (error.code === '22023' && /slug/i.test(error.message || '')) return SLUG_FORMAT_MESSAGE;
  if (error.code === '23514' && /slug_not_reserved/i.test(error.message || '')) return RESERVED_SLUG_MESSAGE;
  return null;
}

interface SlugFieldProps {
  table: SlugTable;
  value: string;
  onChange: (slug: string) => void;
  /** Current title/name; used to auto-fill while creating. */
  title: string;
  /** True when creating a new item: slug follows the title until edited by hand. */
  autoFill: boolean;
  /** Id of the item being edited (excluded from the duplicate check). */
  excludeId?: string | null;
  /** Saved slug of the item being edited; shows the redirect notice when changed. */
  originalSlug?: string | null;
  /** Whether the saved item is live (redirects are only created for published items). */
  isPublished?: boolean;
  /** Error from the last save attempt. */
  error?: string | null;
  id?: string;
}

export default function SlugField({
  table, value, onChange, title, autoFill, excludeId, originalSlug, isPublished = true, error, id = 'slug',
}: SlugFieldProps) {
  const touched = useRef(false);
  const [status, setStatus] = useState<'idle' | 'checking' | 'ok' | 'taken'>('idle');

  // Auto-fill from the title while creating, until the admin edits the slug.
  useEffect(() => {
    if (autoFill && !touched.current) {
      const next = slugify(title);
      if (next !== value) onChange(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, autoFill]);

  // Debounced duplicate check.
  useEffect(() => {
    if (!value || !isValidSlug(value) || value === originalSlug) {
      setStatus('idle');
      return;
    }
    setStatus('checking');
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const available = await isSlugAvailable(table, value, excludeId);
        if (!cancelled) setStatus(available ? 'ok' : 'taken');
      } catch {
        if (!cancelled) setStatus('idle');
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [table, value, excludeId, originalSlug]);

  const prefix = SLUG_PATH_PREFIX[table];
  const formatInvalid = !!value && value !== originalSlug && !isValidSlug(value);
  const reserved = table === 'site_pages' && isReservedPageSlug(value);
  const message = error || (reserved ? RESERVED_SLUG_MESSAGE : status === 'taken' ? SLUG_TAKEN_MESSAGE : formatInvalid ? SLUG_FORMAT_MESSAGE : null);
  const willRedirect = !!originalSlug && !!value && value !== originalSlug && isPublished;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>URL Slug</Label>
      <div className="relative">
        <Input
          id={id}
          value={value}
          maxLength={SLUG_MAX_LENGTH}
          onChange={(e) => {
            touched.current = true;
            onChange(slugify(e.target.value, { trimEdges: false }));
          }}
          onBlur={() => onChange(slugify(value))}
          placeholder="auto-filled-from-title"
          aria-invalid={!!message}
          aria-describedby={`${id}-help`}
          className={message ? 'border-destructive pr-9' : 'pr-9'}
          required
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          {status === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {status === 'ok' && !message && <Check className="h-4 w-4 text-green-600" />}
          {message && <AlertCircle className="h-4 w-4 text-destructive" />}
        </span>
      </div>
      <div id={`${id}-help`} className="space-y-1 text-xs">
        {message ? (
          <p className="text-destructive font-medium">{message}</p>
        ) : (
          <p className="text-muted-foreground">
            URL: {prefix}{value || '…'} · {value.length}/{SLUG_MAX_LENGTH}
          </p>
        )}
        {willRedirect && (
          <p className="flex items-center gap-1 text-amber-700">
            <CornerDownRight className="h-3 w-3" />
            {prefix}{originalSlug} will 301-redirect to the new URL.
          </p>
        )}
      </div>
    </div>
  );
}
