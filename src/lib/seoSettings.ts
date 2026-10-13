/**
 * Dashboard → SEO & Tracking: everything search engines, analytics and AI assistants read from the
 * site. Stored in site_settings under SEO_SETTINGS_KEY; empty/unsaved values fall back to
 * DEFAULT_SEO_SETTINGS, which are the values the site used before this screen existed.
 */
export const SEO_SETTINGS_KEY = 'seo_tracking';

export interface SchemaBlock {
  id: string;
  name: string;
  enabled: boolean;
  /** JSON-LD object as text (validated on save). */
  json: string;
}

export interface SeoSettings {
  google_verification: string;
  bing_verification: string;
  ga_id: string;
  clarity_id: string;
  robots_mode: 'recommended' | 'custom';
  robots_custom: string;
  llms_mode: 'recommended' | 'custom';
  llms_custom: string;
  schema_blocks: SchemaBlock[];
}

const SITE_NAVIGATION_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Mrbedmed',
  url: 'https://mrbedmed.com',
  hasPart: [
    { '@type': 'SiteNavigationElement', name: 'Products', url: 'https://mrbedmed.com/products' },
    { '@type': 'SiteNavigationElement', name: 'Services', url: 'https://mrbedmed.com/services' },
    { '@type': 'SiteNavigationElement', name: 'Parts', url: 'https://mrbedmed.com/parts' },
    { '@type': 'SiteNavigationElement', name: 'About Us', url: 'https://mrbedmed.com/about-us' },
    { '@type': 'SiteNavigationElement', name: 'Contact Us', url: 'https://mrbedmed.com/contact-us' },
  ],
};

export const DEFAULT_SEO_SETTINGS: SeoSettings = {
  google_verification: 'cwYTQFNoWwxVD-Buidhtv_iL6rciP1ha2qanxMgfLng',
  bing_verification: '',
  ga_id: 'G-N6VD2Z798P',
  clarity_id: 'x8j4k2099m',
  robots_mode: 'recommended',
  robots_custom: '',
  llms_mode: 'recommended',
  llms_custom: '',
  schema_blocks: [
    { id: 'site-navigation', name: 'Site navigation', enabled: true, json: JSON.stringify(SITE_NAVIGATION_SCHEMA, null, 2) },
  ],
};

const str = (v: unknown, fallback: string) => (typeof v === 'string' ? v : fallback);

export function withSeoDefaults(saved: unknown): SeoSettings {
  const s = (saved && typeof saved === 'object' ? saved : {}) as Partial<SeoSettings>;
  const d = DEFAULT_SEO_SETTINGS;
  return {
    google_verification: str(s.google_verification, d.google_verification),
    bing_verification: str(s.bing_verification, d.bing_verification),
    ga_id: str(s.ga_id, d.ga_id),
    clarity_id: str(s.clarity_id, d.clarity_id),
    robots_mode: s.robots_mode === 'custom' ? 'custom' : 'recommended',
    robots_custom: str(s.robots_custom, ''),
    llms_mode: s.llms_mode === 'custom' ? 'custom' : 'recommended',
    llms_custom: str(s.llms_custom, ''),
    schema_blocks: Array.isArray(s.schema_blocks)
      ? s.schema_blocks
          .filter((b) => b && typeof b.json === 'string')
          .map((b, i) => ({ id: str(b.id, `block-${i + 1}`), name: str(b.name, `Block ${i + 1}`), enabled: b.enabled !== false, json: b.json }))
      : d.schema_blocks,
  };
}

/* ------------------------------------------------------------------ input clean-up + validation */

/**
 * Verification codes are often pasted as the whole tag Google/Bing show
 * (<meta name="google-site-verification" content="abc" />); keep only the code.
 */
export function cleanVerification(value: string): string {
  const v = value.trim();
  const m = /content\s*=\s*["']([^"']+)["']/i.exec(v);
  return (m ? m[1] : v).trim();
}

export const isValidVerification = (v: string) => v === '' || /^[A-Za-z0-9_\-=.]{6,120}$/.test(v);

/** "G-XXXX", also accepted in lower case or with spaces around it. */
export const cleanGaId = (v: string) => v.trim().toUpperCase();
export const isValidGaId = (v: string) => v === '' || /^G-[A-Z0-9]{4,20}$/.test(v);

/** Clarity project id; a pasted clarity.ms/tag/<id> URL is reduced to the id. */
export function cleanClarityId(value: string): string {
  const v = value.trim();
  const m = /clarity\.ms\/tag\/([a-z0-9]+)/i.exec(v);
  return (m ? m[1] : v).toLowerCase();
}
export const isValidClarityId = (v: string) => v === '' || /^[a-z0-9]{6,20}$/.test(v);

/** Parses a JSON-LD block; returns an error message or null. Accepts the object with or without <script> tags. */
export function schemaBlockError(text: string): string | null {
  const body = stripScriptTag(text).trim();
  if (!body) return 'Paste a JSON-LD object.';
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch (e) {
    return `Not valid JSON: ${(e as Error).message}`;
  }
  const items = Array.isArray(value) ? value : [value];
  if (!items.length || items.some((i) => !i || typeof i !== 'object' || Array.isArray(i))) return 'Must be a JSON object (or a list of objects).';
  if (items.some((i) => !('@type' in (i as object)) && !('@graph' in (i as object)))) return 'Each object needs an "@type" (for example "Organization").';
  return null;
}

export const stripScriptTag = (text: string) =>
  text.replace(/^\s*<script[^>]*>/i, '').replace(/<\/script>\s*$/i, '');

/** Pretty JSON for the page source; "<" escaped so content can never close the script tag. */
export function schemaBlockHtml(text: string): string | null {
  if (schemaBlockError(text)) return null;
  const json = JSON.stringify(JSON.parse(stripScriptTag(text).trim()), null, 2).replace(/</g, '\\u003c');
  return `\n${json}\n`;
}

/* ------------------------------------------------------------------------------ robots.txt */

/**
 * Recommended robots.txt: keeps the AI-training opt-out the site already used, keeps private
 * pages (dashboard, sign-in, cart, checkout, account, API) out of search, points to the sitemap.
 */
export function recommendedRobots(siteUrl: string): string {
  const origin = siteUrl.replace(/\/+$/, '');
  const aiTraining = ['Amazonbot', 'Applebot-Extended', 'Bytespider', 'CCBot', 'ClaudeBot', 'Google-Extended', 'GPTBot', 'meta-externalagent'];
  return [
    '# Search engines may crawl the whole public website; AI model training is not allowed.',
    'User-agent: *',
    'Content-Signal: search=yes,ai-train=no',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /auth',
    'Disallow: /cart',
    'Disallow: /checkout',
    'Disallow: /account',
    'Disallow: /orders',
    'Disallow: /api/',
    'Disallow: /newsletter/unsubscribe',
    '',
    '# AI training crawlers',
    ...aiTraining.flatMap((bot) => [`User-agent: ${bot}`, 'Disallow: /', '']),
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
}

export const robotsTxt = (s: SeoSettings, siteUrl: string) =>
  s.robots_mode === 'custom' && s.robots_custom.trim() ? `${s.robots_custom.trim()}\n` : recommendedRobots(siteUrl);

/* -------------------------------------------------------------------------------- llms.txt */

export interface LlmsData {
  siteUrl: string;
  name: string;
  description: string;
  contact: { phone?: string; email?: string; address?: string };
  services: { title: string; slug: string; summary?: string | null }[];
  categories: { name: string; slug: string }[];
  posts: { title: string; slug: string; excerpt?: string | null }[];
}

const oneLine = (s: string | null | undefined, max = 160) => {
  const t = (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
};

/** llms.txt (llmstxt.org): a plain Markdown guide to the site for AI assistants. */
export function buildLlmsTxt(d: LlmsData): string {
  const origin = d.siteUrl.replace(/\/+$/, '');
  const link = (label: string, path: string, note?: string | null) => `- [${label}](${origin}${path})${oneLine(note) ? `: ${oneLine(note)}` : ''}`;
  const contact = [
    d.contact.phone && `- Phone: ${d.contact.phone}`,
    d.contact.email && `- Email: ${d.contact.email}`,
    d.contact.address && `- Address: ${d.contact.address}`,
    `- Contact form and quotes: ${origin}/contact-us`,
  ].filter(Boolean);
  return [
    `# ${d.name}`,
    '',
    `> ${oneLine(d.description, 300)}`,
    '',
    '## Main pages',
    link('Products', '/products', 'New and refurbished hospital beds, stretchers and accessories with prices'),
    link('Services', '/services'),
    link('Parts', '/parts'),
    link('About us', '/about-us'),
    link('Contact us', '/contact-us'),
    link('FAQ', '/faq'),
    link('Blog', '/blog'),
    '',
    ...(d.services.length ? ['## Services', ...d.services.map((s) => link(s.title, `/services/${s.slug}`, s.summary)), ''] : []),
    ...(d.categories.length ? ['## Product categories', ...d.categories.map((c) => link(c.name, `/category/${c.slug}`)), ''] : []),
    ...(d.posts.length ? ['## Latest blog posts', ...d.posts.map((p) => link(p.title, `/blog/${p.slug}`, p.excerpt)), ''] : []),
    '## Contact',
    ...contact,
    '',
    `Full list of pages: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
}
