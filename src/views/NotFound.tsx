'use client';

import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { Link, useNavigate } from '@/lib/router';
import { queries } from '@/queries';
import { RedirectOrFallback } from '@/components/RedirectOrFallback';
import { CallButton } from '@/components/CallButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const MAIN_PAGES = [
  { label: 'All Products', to: '/products' },
  { label: 'Services', to: '/services' },
  { label: 'Parts', to: '/parts' },
  { label: 'Blog', to: '/blog' },
  { label: 'Contact Us', to: '/contact-us' },
];

/**
 * 404 page: search, the main categories (same list as the header menu) and the phone number.
 * The HTTP 404 status and robots "noindex" come from the server.
 */
export const NotFoundContent = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const { data: menu = [] } = useQuery(queries.homeMenu());

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/products?search=${encodeURIComponent(q)}` : '/products');
  };

  return (
    <section className="bg-muted py-16 md:py-24">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Error 404</p>
          <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">Page not found</h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            The page you are looking for may have moved or no longer exists. Search our equipment, browse a category
            below, or call us and we will help you find it.
          </p>

          <form action="/products" method="get" onSubmit={onSearch} role="search" className="mx-auto mt-8 flex max-w-xl gap-2">
            <label htmlFor="not-found-search" className="sr-only">Search products</label>
            <Input
              id="not-found-search"
              name="search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search beds, stretchers, parts…"
              className="h-11 bg-background"
            />
            <Button type="submit" size="lg" className="h-11">
              <Search className="h-4 w-4" aria-hidden="true" />
              Search
            </Button>
          </form>
        </div>

        {menu.length > 0 && (
          <nav aria-label="Main categories" className="mt-12 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            {menu.map((card) => (
              <div key={card.id} className="rounded-lg border bg-background p-5">
                <h2 className="font-display text-lg font-semibold">{card.title}</h2>
                <ul className="mt-3 space-y-2">
                  {card.items.map((item) => (
                    <li key={item.id}>
                      <Link to={`/category/${item.slug.toLowerCase()}`} className="text-primary hover:underline">
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        )}

        <nav aria-label="Main pages" className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2">
          <Link to="/" className="font-medium text-primary hover:underline">Home</Link>
          {MAIN_PAGES.map((page) => (
            <Link key={page.to} to={page.to} className="font-medium text-primary hover:underline">
              {page.label}
            </Link>
          ))}
        </nav>

        <div className="mt-10 text-center">
          <p className="mb-3 text-muted-foreground">Need help finding equipment?</p>
          <CallButton tone="onLight" />
        </div>
      </div>
    </section>
  );
};

/** Client-side fallback: follows a redirect for the current URL if one exists, else shows the 404 page. */
const NotFound = () => <RedirectOrFallback fallback={<NotFoundContent />} />;

export default NotFound;
