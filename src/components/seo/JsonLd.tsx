import { parseCustomSchema } from '@/lib/schema';

interface JsonLdProps {
  /** Unique per page section, e.g. "product", "breadcrumb", "custom". */
  id: string;
  data: object | object[] | null | undefined;
}

/**
 * Outputs <script type="application/ld+json"> as part of the page HTML, so it is in the
 * server-rendered source that Google reads (not added later by JavaScript).
 * "<" is escaped so the JSON can never close the script tag.
 */
export function JsonLd({ id, data }: JsonLdProps) {
  if (!data) return null;
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script type="application/ld+json" data-schema={id} dangerouslySetInnerHTML={{ __html: json }} />;
}

/** Renders the admin-entered "Custom schema (JSON-LD)" box; invalid JSON is ignored. */
export function CustomJsonLd({ value }: { value: string | null | undefined }) {
  const parsed = parseCustomSchema(value);
  return <JsonLd id="custom" data={parsed.ok ? parsed.value : null} />;
}
