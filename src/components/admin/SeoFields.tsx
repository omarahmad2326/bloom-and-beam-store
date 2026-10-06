import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { parseCustomSchema } from '@/lib/schema';
import { SITE_URL } from '@/lib/site';
import { cn } from '@/lib/utils';

export const META_TITLE_MAX = 60;
export const META_DESCRIPTION_MAX = 160;

export interface SeoValues {
  meta_title: string;
  meta_description: string;
  custom_schema: string;
}

interface SeoFieldsProps {
  values: SeoValues;
  onChange: (patch: Partial<SeoValues>) => void;
  /** Path of the page, for the search preview (e.g. /products/my-slug). */
  path: string;
  /** Shown in the preview when the meta title/description are empty. */
  fallbackTitle?: string;
  fallbackDescription?: string;
  required?: boolean;
}

/** Returns an error message when the custom schema box holds invalid JSON-LD. */
export function customSchemaError(value: string): string | null {
  const result = parseCustomSchema(value);
  return 'error' in result ? result.error : null;
}

export default function SeoFields({
  values, onChange, path, fallbackTitle = '', fallbackDescription = '', required = false,
}: SeoFieldsProps) {
  const schemaError = useMemo(() => customSchemaError(values.custom_schema), [values.custom_schema]);
  const previewTitle = values.meta_title || fallbackTitle;
  const previewDescription = values.meta_description || fallbackDescription;

  return (
    <fieldset className="space-y-4 rounded-lg border p-4">
      <legend className="px-1 text-sm font-semibold">SEO</legend>

      <div className="space-y-2">
        <Label htmlFor="meta_title" className="flex items-center justify-between">
          <span>Meta Title {required && <span className="text-destructive">*</span>}</span>
          <Counter length={values.meta_title.length} max={META_TITLE_MAX} />
        </Label>
        <Input
          id="meta_title"
          value={values.meta_title}
          onChange={(e) => onChange({ meta_title: e.target.value.slice(0, META_TITLE_MAX) })}
          maxLength={META_TITLE_MAX}
          required={required}
          placeholder={fallbackTitle ? `Defaults to: ${fallbackTitle}` : 'SEO title (max 60 characters)'}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="meta_description" className="flex items-center justify-between">
          <span>Meta Description {required && <span className="text-destructive">*</span>}</span>
          <Counter length={values.meta_description.length} max={META_DESCRIPTION_MAX} />
        </Label>
        <Textarea
          id="meta_description"
          value={values.meta_description}
          onChange={(e) => onChange({ meta_description: e.target.value.slice(0, META_DESCRIPTION_MAX) })}
          maxLength={META_DESCRIPTION_MAX}
          required={required}
          rows={2}
          placeholder="Summary shown in Google results (max 160 characters)"
        />
      </div>

      {(previewTitle || previewDescription) && (
        <div className="rounded-md bg-muted/40 p-3 text-sm" aria-label="Search result preview">
          <p className="truncate text-xs text-muted-foreground">{SITE_URL.replace(/^https?:\/\//, '')}{path}</p>
          <p className="truncate text-[#1a0dab] dark:text-blue-400 text-base">{previewTitle}</p>
          <p className="line-clamp-2 text-muted-foreground">{previewDescription}</p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="custom_schema">Custom schema (JSON-LD)</Label>
        <Textarea
          id="custom_schema"
          value={values.custom_schema}
          onChange={(e) => onChange({ custom_schema: e.target.value })}
          rows={5}
          spellCheck={false}
          className={cn('font-mono text-xs', schemaError && 'border-destructive')}
          placeholder={'Optional extra schema, e.g.\n{\n  "@context": "https://schema.org",\n  "@type": "FAQPage",\n  "mainEntity": [ ... ]\n}'}
          aria-invalid={!!schemaError}
        />
        {schemaError ? (
          <p className="text-xs font-medium text-destructive">{schemaError}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Added to the page alongside the automatic schema. Must be valid JSON before saving.
          </p>
        )}
      </div>
    </fieldset>
  );
}

function Counter({ length, max }: { length: number; max: number }) {
  return (
    <span className={cn('text-xs font-normal', length >= max ? 'text-destructive' : 'text-muted-foreground')}>
      {length}/{max}
    </span>
  );
}
