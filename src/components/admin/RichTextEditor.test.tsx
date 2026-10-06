import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn(), storage: { from: vi.fn() } } }));

import RichTextEditor from './RichTextEditor';

afterEach(cleanup);

// jsdom has no layout engine; ProseMirror measures the selection to scroll it into view after a paste.
const noRect = () => ({ x: 0, y: 0, top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0, toJSON: () => ({}) });
for (const proto of [Element.prototype, Range.prototype] as Array<{ getClientRects?: unknown; getBoundingClientRect?: unknown }>) {
  proto.getClientRects ??= () => [];
  proto.getBoundingClientRect ??= noRect;
}
document.elementFromPoint ??= () => null;

const wrap = (ui: React.ReactElement) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

describe('RichTextEditor', () => {
  it('loads legacy Markdown as formatted content', async () => {
    const { container } = wrap(<RichTextEditor value={'## Heading\n\nSome **bold** text'} onChange={() => {}} />);
    await waitFor(() => {
      const pm = container.querySelector('.ProseMirror');
      expect(pm?.querySelector('h2')?.textContent).toBe('Heading');
      expect(pm?.querySelector('strong')?.textContent).toBe('bold');
    });
  });

  it('renders the formatting toolbar', () => {
    const { getByLabelText } = wrap(<RichTextEditor value="" onChange={() => {}} />);
    for (const label of ['Bold (Ctrl+B)', 'Heading 2', 'Bullet list', 'Insert / edit link', 'Insert image', 'Edit HTML source']) {
      expect(getByLabelText(label)).toBeTruthy();
    }
  });

  it('keeps a pasted table (Word / Excel / Google Docs HTML) as a table', async () => {
    let saved = '';
    const { container } = wrap(<RichTextEditor value="" onChange={(html) => { saved = html; }} />);
    const pm = await waitFor(() => {
      const el = container.querySelector('.ProseMirror') as HTMLElement;
      expect(el).toBeTruthy();
      return el;
    });
    // Typical clipboard HTML from a spreadsheet/office app: styles, <colgroup>, <font>, no <th>.
    const clipboardHtml =
      '<meta charset="utf-8"><table border="1" style="border-collapse:collapse"><colgroup><col width="120"><col width="80"></colgroup>' +
      '<tbody><tr><td style="font-weight:bold">Model</td><td><b>Capacity</b></td></tr>' +
      '<tr><td><font face="Calibri">Stryker 1007</font></td><td>700 lb</td></tr>' +
      '<tr><td>Hill-Rom P8000</td><td>500 lb</td></tr></tbody></table>';
    const clipboardData = {
      types: ['text/html', 'text/plain'],
      getData: (type: string) => (type === 'text/html' ? clipboardHtml : 'Model\tCapacity\nStryker 1007\t700 lb'),
    };
    pm.focus();
    fireEvent.paste(pm, { clipboardData });

    await waitFor(() => {
      const rows = pm.querySelectorAll('table tr');
      expect(rows.length).toBe(3);
      expect(rows[1].querySelectorAll('td, th')[0].textContent).toBe('Stryker 1007');
    });
    expect(saved).toContain('<table');
    expect(saved).toContain('700 lb');
    expect(saved).not.toContain('<font');
  });

  it('renders saved table HTML as a table', async () => {
    const { container } = wrap(
      <RichTextEditor value={'<table><tbody><tr><th><p>A</p></th><th><p>B</p></th></tr><tr><td><p>1</p></td><td><p>2</p></td></tr></tbody></table>'} onChange={() => {}} />,
    );
    await waitFor(() => expect(container.querySelectorAll('.ProseMirror table th').length).toBe(2));
    expect(container.querySelectorAll('.ProseMirror table td').length).toBe(2);
  });

  it('converts legacy Markdown tables into editable tables', async () => {
    const { container } = wrap(<RichTextEditor value={'| Model | Capacity |\n| --- | --- |\n| Stryker 1007 | 700 lb |'} onChange={() => {}} />);
    await waitFor(() => expect(container.querySelectorAll('.ProseMirror table tr').length).toBe(2));
  });

  it('keeps alt="" on decorative images (not dropped, not filled in)', async () => {
    const { container } = wrap(<RichTextEditor value={'<p>Hi</p><img src="https://x/deco.png" alt="">'} onChange={() => {}} />);
    await waitFor(() => {
      const img = container.querySelector('.ProseMirror img');
      expect(img?.hasAttribute('alt')).toBe(true);
      expect(img?.getAttribute('alt')).toBe('');
    });
  });

  it('loads saved HTML including image ALT text', async () => {
    const { container } = wrap(<RichTextEditor value={'<p>Hi</p><img src="https://x/a.png" alt="Side view">'} onChange={() => {}} />);
    await waitFor(() => expect(container.querySelector('.ProseMirror img')?.getAttribute('alt')).toBe('Side view'));
  });
});
