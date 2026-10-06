// Same sanitizer in the browser and during server rendering (server side uses a jsdom window).
import DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';

// Content written before the rich-text editor was introduced is Markdown;
// new content is HTML. Everything that renders or edits content goes through here.

const HTML_START = /^\s*<(p|h[1-6]|ul|ol|li|blockquote|div|figure|img|table|pre|hr|br|strong|em|a)[\s>/]/i;

export function isHtml(content: string): boolean {
  return HTML_START.test(content);
}

/** Convert stored content (HTML or legacy Markdown) to HTML. */
export function contentToHtml(content: string | null | undefined): string {
  if (!content) return '';
  if (isHtml(content)) return content;
  return marked.parse(content, { async: false, gfm: true, breaks: true }) as string;
}

let hooksInstalled = false;
function installHooks() {
  if (hooksInstalled) return;
  hooksInstalled = true;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      const href = node.getAttribute('href') || '';
      if (/^https?:\/\//i.test(href)) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    }
  });
}

export function sanitizeHtml(html: string): string {
  installHooks();
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, ADD_ATTR: ['target'] });
}

/**
 * HTML that is safe to inject into a page. Page titles are the only <h1>,
 * so headings inside content are demoted to <h2>.
 */
export function renderableHtml(content: string | null | undefined): string {
  return sanitizeHtml(contentToHtml(content)).replace(/<(\/?)h1(\s|>)/gi, '<$1h2$2');
}

/** True when the content has no visible text or images (e.g. "<p></p>"). */
export function isContentEmpty(content: string | null | undefined): boolean {
  if (!content) return true;
  if (/<img\s/i.test(content)) return false;
  return toPlainText(content).length === 0;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };

/** Text content of sanitized HTML: DOMParser in the browser, a tag/entity stripper on the server. */
function htmlToText(html: string): string {
  if (typeof DOMParser !== 'undefined') {
    return new DOMParser().parseFromString(html, 'text/html').body.textContent || '';
  }
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === '#') {
        const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : m;
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    });
}

/** Plain text for cards, meta descriptions and structured data. */
export function toPlainText(content: string | null | undefined, maxLength?: number): string {
  if (!content) return '';
  const html = sanitizeHtml(contentToHtml(content))
    .replace(/<\/(p|h[1-6]|li|blockquote|div)>/gi, '$& ')
    .replace(/<br\s*\/?>/gi, ' ');
  const text = htmlToText(html).replace(/\s+/g, ' ').trim();
  return maxLength ? truncate(text, maxLength) : text;
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > maxLength * 0.4 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–-]+$/, '')}…`;
}
