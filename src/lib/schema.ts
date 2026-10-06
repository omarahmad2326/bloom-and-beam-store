import { SITE_NAME, SITE_URL, DEFAULT_LOGO_PATH, absoluteUrl } from '@/lib/site';
import { toPlainText, truncate } from '@/lib/content';
import type { ContactInfo } from '@/lib/contactInfo';
import { postalAddressOf } from '@/lib/contactInfo';

type JsonLdObject = Record<string, unknown>;

const CONDITION_URL: Record<string, string> = {
  new: 'https://schema.org/NewCondition',
  refurbished: 'https://schema.org/RefurbishedCondition',
  used: 'https://schema.org/UsedCondition',
};

export interface ProductSchemaInput {
  name: string;
  path: string;
  image?: string | null;
  description?: string | null;
  brand?: string | null;
  sku?: string | null;
  price: number;
  inStock: boolean;
  condition?: string | null;
}

export function productSchema(p: ProductSchemaInput): JsonLdObject {
  const url = absoluteUrl(p.path);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    url,
    image: absoluteUrl(p.image),
    description: p.description ? truncate(toPlainText(p.description), 5000) : undefined,
    sku: p.sku || undefined,
    brand: p.brand ? { '@type': 'Brand', name: p.brand } : undefined,
    offers: {
      '@type': 'Offer',
      url,
      price: Number(p.price || 0).toFixed(2),
      priceCurrency: 'USD',
      availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: CONDITION_URL[p.condition || 'new'] ?? CONDITION_URL.new,
      seller: { '@type': 'Organization', name: SITE_NAME },
    },
  };
}

export interface ServiceSchemaInput {
  name: string;
  path: string;
  description?: string | null;
  areasServed?: string[] | null;
  image?: string | null;
  contact: ContactInfo;
}

export function serviceSchema(s: ServiceSchemaInput): JsonLdObject {
  const address = postalAddressOf(s.contact);
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: s.name,
    url: absoluteUrl(s.path),
    description: s.description ? toPlainText(s.description) : undefined,
    image: absoluteUrl(s.image),
    provider: {
      '@type': 'LocalBusiness',
      name: SITE_NAME,
      url: SITE_URL,
      telephone: s.contact.phone || undefined,
      email: s.contact.email || undefined,
      image: absoluteUrl(s.contact.logo_url || DEFAULT_LOGO_PATH),
      address: address.streetAddress
        ? { '@type': 'PostalAddress', ...address }
        : undefined,
    },
    areaServed: s.areasServed && s.areasServed.length > 0 ? s.areasServed : undefined,
  };
}

export interface BlogPostingSchemaInput {
  title: string;
  path: string;
  description?: string | null;
  image?: string | null;
  author: string;
  publishedAt: string;
  modifiedAt?: string | null;
  logoUrl?: string | null;
}

export function blogPostingSchema(b: BlogPostingSchemaInput): JsonLdObject {
  const url = absoluteUrl(b.path);
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: truncate(b.title, 110),
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    description: b.description ? toPlainText(b.description, 300) : undefined,
    image: absoluteUrl(b.image),
    datePublished: b.publishedAt,
    dateModified: b.modifiedAt || b.publishedAt,
    author: { '@type': 'Person', name: b.author },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: absoluteUrl(b.logoUrl || DEFAULT_LOGO_PATH) },
    },
  };
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbSchema(crumbs: Crumb[]): JsonLdObject {
  const all = [{ name: 'Home', path: '/' }, ...crumbs];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: all.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

export function faqPageSchema(faqs: { question: string; answer: string }[]): JsonLdObject | null {
  const items = faqs.filter((f) => f.question.trim() && f.answer.trim());
  if (items.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: toPlainText(f.answer) },
    })),
  };
}

export type CustomSchemaResult =
  | { ok: true; value: JsonLdObject | JsonLdObject[] | null }
  | { ok: false; error: string };

/**
 * Validate the "Custom schema (JSON-LD)" box. Accepts a JSON object or an array
 * of objects; a pasted <script type="application/ld+json"> wrapper is tolerated.
 */
export function parseCustomSchema(text: string | null | undefined): CustomSchemaResult {
  const raw = (text || '')
    .trim()
    .replace(/^<script[^>]*>/i, '')
    .replace(/<\/script>$/i, '')
    .trim();
  if (!raw) return { ok: true, value: null };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: `Invalid JSON: ${(e as Error).message}` };
  }

  const isObject = (v: unknown): v is JsonLdObject => typeof v === 'object' && v !== null && !Array.isArray(v);
  if (Array.isArray(parsed)) {
    if (parsed.length === 0 || !parsed.every(isObject)) {
      return { ok: false, error: 'A JSON-LD array must contain one or more objects.' };
    }
    return { ok: true, value: parsed };
  }
  if (!isObject(parsed)) {
    return { ok: false, error: 'JSON-LD must be an object like { "@context": "https://schema.org", "@type": "FAQPage", ... }.' };
  }
  if (!('@type' in parsed) && !('@graph' in parsed)) {
    return { ok: false, error: 'JSON-LD needs an "@type" (or "@graph").' };
  }
  return { ok: true, value: parsed };
}
