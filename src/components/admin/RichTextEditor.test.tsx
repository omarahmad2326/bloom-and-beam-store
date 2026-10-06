import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn(), storage: { from: vi.fn() } } }));

import RichTextEditor from './RichTextEditor';

afterEach(cleanup);

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

  it('loads saved HTML including image ALT text', async () => {
    const { container } = wrap(<RichTextEditor value={'<p>Hi</p><img src="https://x/a.png" alt="Side view">'} onChange={() => {}} />);
    await waitFor(() => expect(container.querySelector('.ProseMirror img')?.getAttribute('alt')).toBe('Side view'));
  });
});
