import { useEffect } from 'react';
import { parseCustomSchema } from '@/lib/schema';

interface JsonLdProps {
  /** Unique per page section, e.g. "product", "breadcrumb", "custom". */
  id: string;
  data: object | object[] | null | undefined;
}

/** Outputs <script type="application/ld+json"> in <head> while mounted. */
export function JsonLd({ id, data }: JsonLdProps) {
  const json = data ? JSON.stringify(data) : '';

  useEffect(() => {
    if (!json) return;
    document.head.querySelectorAll(`script[data-schema="${id}"]`).forEach((el) => el.remove());
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.schema = id;
    script.textContent = json.replace(/</g, '\\u003c');
    document.head.appendChild(script);
    return () => script.remove();
  }, [id, json]);

  return null;
}

/** Renders the admin-entered "Custom schema (JSON-LD)" box; invalid JSON is ignored. */
export function CustomJsonLd({ value }: { value: string | null | undefined }) {
  const parsed = parseCustomSchema(value);
  return <JsonLd id="custom" data={parsed.ok ? parsed.value : null} />;
}
