import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DEFAULT_ABOUT, aboutWordCount, withAboutDefaults } from '@/lib/aboutPage';

let saved: unknown = null;
vi.mock('@/integrations/supabase/client', () => {
  const query = () => {
    const q = {
      select: () => q,
      eq: () => q,
      maybeSingle: async () => ({ data: saved ? { value: saved } : null, error: null }),
      single: async () => ({ data: null, error: { code: 'PGRST116' } }),
    };
    return q;
  };
  return { supabase: { from: query } };
});
vi.mock('@/components/layout/Layout', () => ({ Layout: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));

import About from './About';

afterEach(() => { cleanup(); saved = null; });

const renderAbout = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter><About /></MemoryRouter>
    </QueryClientProvider>,
  );

describe('About page', () => {
  it('shows the H1, What We Do cards with links, cities and contact; no unconfirmed numbers', async () => {
    renderAbout();
    await waitFor(() => expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(DEFAULT_ABOUT.h1);
    expect(screen.getByRole('link', { name: /Rental/ }).getAttribute('href')).toBe('/services/equipment-rental');
    expect(screen.getByRole('link', { name: /Dispositioning/ }).getAttribute('href')).toBe('/services/disposition-asset-management');
    expect(screen.queryByRole('link', { name: /Home Health/ })).toBeNull(); // link pending (B5)
    expect(screen.getByText('San Antonio')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'Get in Touch' })).toBeTruthy();
    const text = document.body.textContent || '';
    for (const claim of ['1995', '25+', '500+', '10K+', '98%']) expect(text).not.toContain(claim);
  });

  it('hides empty sections (Who We Are, Mission, Why Choose, Stats, Team)', async () => {
    renderAbout();
    await waitFor(() => screen.getByRole('heading', { level: 2, name: 'What We Do' }));
    for (const title of ['Who We Are', 'Our Mission', 'Why Healthcare Facilities Choose Mrbedmed', 'Our Team']) {
      expect(screen.queryByRole('heading', { name: title })).toBeNull();
    }
  });

  it('renders saved content: all titles are H2, stats and team appear', async () => {
    saved = {
      ...DEFAULT_ABOUT,
      who_html: '<p>We are a Texas team.</p>',
      founding_story: 'Founded by a biomedical technician.',
      mission_html: '<p>Keep patients safe.</p>',
      why_cards: [{ icon: 'Clock', title: 'Fast turnaround', text: 'Same week.', link: '' }],
      stats: [{ value: '20+', label: 'Years in business' }],
      team: [{ name: 'Jane Doe', role: 'Lead Technician', years: '15 years of experience', photo_url: '', photo_alt: '' }],
    };
    renderAbout();
    await waitFor(() => screen.getByText('We are a Texas team.'));
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    for (const title of ['Who We Are', 'Our Mission', 'What We Do', 'Why Healthcare Facilities Choose Mrbedmed', 'Our Team', 'Serving Healthcare Facilities Across Texas', 'Get in Touch']) {
      expect(screen.getByRole('heading', { level: 2, name: title })).toBeTruthy();
    }
    expect(screen.getByText('20+')).toBeTruthy();
    expect(screen.getByText('Jane Doe')).toBeTruthy();
    expect(screen.getByText('Founded by a biomedical technician.')).toBeTruthy();
  });
});

describe('aboutPage lib', () => {
  it('fills missing fields from defaults', () => {
    const c = withAboutDefaults({ h1: 'Custom' });
    expect(c.h1).toBe('Custom');
    expect(c.what_cards).toHaveLength(6);
  });

  it('counts words of visible sections only', () => {
    const base = aboutWordCount(DEFAULT_ABOUT);
    const more = aboutWordCount({ ...DEFAULT_ABOUT, who_html: '<p>one two three four five</p>' });
    expect(more - base).toBe(5 + 3); // body + "Who We Are"
  });
});
