// @vitest-environment node
// The content helpers must also work during Next.js server rendering (no browser DOM).
import { describe, expect, it } from 'vitest';
import { renderableHtml, toPlainText } from './content';

describe('content helpers on the server', () => {
  it('has no browser DOM in this test', () => {
    expect(typeof window).toBe('undefined');
    expect(typeof DOMParser).toBe('undefined');
  });

  it('sanitizes rich text (scripts and event handlers removed)', () => {
    const html = renderableHtml('<p onclick="x()">Hi <a href="https://example.com">site</a></p><script>alert(1)</script>');
    expect(html).not.toMatch(/script|onclick/);
    expect(html).toContain('<p>Hi');
    expect(html).toContain('target="_blank"');
  });

  it('converts legacy Markdown and demotes h1', () => {
    expect(renderableHtml('# Title\n\nText')).toContain('<h2');
  });

  it('extracts plain text with entities decoded', () => {
    expect(toPlainText('<h2>Stryker &amp; Hill-Rom</h2><p>700&nbsp;lb &lt;max&gt; &#8212; refurbished</p>'))
      .toBe('Stryker & Hill-Rom 700 lb <max> — refurbished');
    expect(toPlainText('<p>one two three four five</p>', 12)).toBe('one two…');
  });

  it('drops the text inside style blocks', () => {
    expect(toPlainText('<style>p{color:red}</style><p>Hi</p>')).toBe('Hi');
  });
});
