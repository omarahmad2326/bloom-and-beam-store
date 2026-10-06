import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { useState } from 'react';

// Fake Supabase: `taken` holds slugs already used by other rows.
const taken = new Set<string>();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => {
      let slug = '';
      const q = {
        select: () => q,
        eq: (_c: string, v: string) => { slug = v; return q; },
        neq: () => q,
        limit: () => q,
        then: (resolve: (r: unknown) => void) => resolve({ data: taken.has(slug) ? [{ id: 'other' }] : [], error: null }),
      };
      return q;
    },
  },
}));

import SlugField, { validateSlugForSave, SLUG_TAKEN_MESSAGE } from './SlugField';

function Harness({ autoFill = true, originalSlug }: { autoFill?: boolean; originalSlug?: string }) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState(originalSlug ?? '');
  return (
    <>
      <input aria-label="title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <SlugField table="products" value={slug} onChange={setSlug} title={title} autoFill={autoFill} originalSlug={originalSlug} />
      <output data-testid="slug">{slug}</output>
    </>
  );
}

beforeEach(() => taken.clear());
afterEach(cleanup);

describe('SlugField', () => {
  it('auto-fills "Test Bed 2" → test-bed-2 when creating', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('title'), { target: { value: 'Test Bed 2' } });
    expect(screen.getByTestId('slug').textContent).toBe('test-bed-2');
  });

  it('stops following the title once edited by hand', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('title'), { target: { value: 'Test Bed 2' } });
    fireEvent.change(screen.getByLabelText('URL Slug'), { target: { value: 'My Custom Slug' } });
    expect(screen.getByTestId('slug').textContent).toBe('my-custom-slug');
    fireEvent.change(screen.getByLabelText('title'), { target: { value: 'Something else' } });
    expect(screen.getByTestId('slug').textContent).toBe('my-custom-slug');
  });

  it('does not auto-fill when editing an existing item', () => {
    render(<Harness autoFill={false} originalSlug="existing" />);
    fireEvent.change(screen.getByLabelText('title'), { target: { value: 'New Title' } });
    expect(screen.getByTestId('slug').textContent).toBe('existing');
  });

  it('shows "This slug is already used." for a duplicate', async () => {
    taken.add('test-bed-2');
    vi.useFakeTimers();
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('title'), { target: { value: 'Test Bed 2' } });
    await act(async () => { vi.advanceTimersByTime(400); });
    vi.useRealTimers();
    await waitFor(() => expect(screen.getByText(SLUG_TAKEN_MESSAGE)).toBeTruthy());
  });

  it('warns that the old URL will redirect when a slug changes', () => {
    render(<Harness autoFill={false} originalSlug="old-slug" />);
    fireEvent.change(screen.getByLabelText('URL Slug'), { target: { value: 'new-slug' } });
    expect(screen.getByText(/\/products\/old-slug will 301-redirect/)).toBeTruthy();
  });
});

describe('validateSlugForSave', () => {
  it('blocks duplicates without appending -1', async () => {
    taken.add('test-bed-2');
    expect(await validateSlugForSave('products', 'test-bed-2')).toBe(SLUG_TAKEN_MESSAGE);
  });
  it('allows a free, valid slug', async () => {
    expect(await validateSlugForSave('products', 'test-bed-2')).toBeNull();
  });
  it('rejects bad format but keeps legacy unchanged slugs valid', async () => {
    expect(await validateSlugForSave('products', 'Bad Slug')).toMatch(/lowercase/);
    expect(await validateSlugForSave('products', 'Legacy_Slug', { originalSlug: 'Legacy_Slug' })).toBeNull();
  });
});
