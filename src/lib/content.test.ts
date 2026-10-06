import { describe, expect, it } from 'vitest';
import { contentToHtml, renderableHtml, toPlainText, isContentEmpty } from './content';

describe('content', () => {
  it('converts legacy Markdown to HTML', () => {
    const html = contentToHtml('## Title\n\nSome **bold** and [a link](/products/x)\n\n- one\n- two');
    expect(html).toContain('<h2>Title</h2>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<a href="/products/x">a link</a>');
    expect(html).toContain('<li>one</li>');
  });

  it('leaves HTML untouched', () => {
    expect(contentToHtml('<p>Hello</p>')).toBe('<p>Hello</p>');
  });

  it('sanitizes scripts and event handlers', () => {
    const html = renderableHtml('<p onclick="alert(1)">Hi</p><script>alert(1)</script><img src=x onerror="alert(1)">');
    expect(html).not.toMatch(/script|onclick|onerror/);
    expect(html).toContain('<p>Hi</p>');
  });

  it('demotes h1 to h2 (page title is the only h1)', () => {
    expect(renderableHtml('# Big')).toContain('<h2');
    expect(renderableHtml('<h1>Big</h1>')).toBe('<h2>Big</h2>');
  });

  it('opens external links in a new tab safely', () => {
    const html = renderableHtml('<p><a href="https://example.com">x</a> <a href="/blog/y">y</a></p>');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toMatch(/<a href="\/blog\/y">y<\/a>/);
  });

  it('extracts plain text with word-boundary truncation', () => {
    expect(toPlainText('<h2>Title</h2><p>Hello <strong>world</strong></p>')).toBe('Title Hello world');
    expect(toPlainText('<p>one two three four five</p>', 12)).toBe('one two…');
  });

  it('detects empty editor output', () => {
    expect(isContentEmpty('<p></p>')).toBe(true);
    expect(isContentEmpty('')).toBe(true);
    expect(isContentEmpty('<p>x</p>')).toBe(false);
    expect(isContentEmpty('<img src="a.png" alt="a">')).toBe(false);
  });
});
