'use client';

/**
 * Router adapter: the react-router-style API the components were written against
 * (Link, NavLink, Navigate, useNavigate, useParams, useLocation, useSearchParams),
 * implemented on top of Next.js navigation. Tests alias this module to
 * router.rr.tsx (react-router-dom) so they can keep using MemoryRouter.
 */
import NextLink from 'next/link';
import {
  useParams as useNextParams,
  usePathname,
  useRouter,
  useSearchParams as useNextSearchParams,
} from 'next/navigation';
import { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';

export type To = string | { pathname?: string; search?: string; hash?: string };

const toHref = (to: To): string =>
  typeof to === 'string' ? to : `${to.pathname ?? ''}${to.search ?? ''}${to.hash ?? ''}` || '/';

export interface NavigateOptions {
  replace?: boolean;
  state?: unknown;
}

export interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: To;
  replace?: boolean;
  state?: unknown;
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link({ to, replace, state: _state, ...rest }, ref) {
  return <NextLink ref={ref} href={toHref(to)} replace={replace} {...rest} />;
});

type NavLinkRenderProps = { isActive: boolean; isPending: boolean };

export interface NavLinkProps extends Omit<LinkProps, 'className' | 'style' | 'children'> {
  className?: string | ((p: NavLinkRenderProps) => string | undefined);
  style?: React.CSSProperties | ((p: NavLinkRenderProps) => React.CSSProperties | undefined);
  children?: React.ReactNode | ((p: NavLinkRenderProps) => React.ReactNode);
  /** Only active on an exact match. */
  end?: boolean;
}

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(function NavLink(
  { to, end, className, style, children, ...rest },
  ref,
) {
  const pathname = usePathname() || '/';
  const target = toHref(to).split(/[?#]/)[0] || '/';
  const isActive = end || target === '/' ? pathname === target : pathname === target || pathname.startsWith(`${target}/`);
  const state = { isActive, isPending: false };
  return (
    <Link
      ref={ref}
      to={to}
      aria-current={isActive ? 'page' : undefined}
      className={typeof className === 'function' ? className(state) : className}
      style={typeof style === 'function' ? style(state) : style}
      {...rest}
    >
      {typeof children === 'function' ? children(state) : children}
    </Link>
  );
});

export function useNavigate() {
  const router = useRouter();
  return useCallback(
    (to: To | number, options?: NavigateOptions) => {
      if (typeof to === 'number') {
        if (to < 0) router.back();
        else router.forward();
        return;
      }
      const href = toHref(to);
      if (options?.replace) router.replace(href);
      else router.push(href);
    },
    [router],
  );
}

/** Route params as strings (catch-all segments joined with "/"). */
export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>(): T {
  const params = useNextParams();
  return useMemo(() => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(params ?? {})) out[k] = Array.isArray(v) ? v.join('/') : String(v);
    return out as T;
  }, [params]);
}

/**
 * Current location. The query string is read from window.location after mount instead of via
 * Next's useSearchParams, which would force everything around the caller (the header is on every
 * page) out of server rendering on statically rendered routes such as the 404 page.
 * Components that need query parameters during server rendering use useSearchParams below.
 */
export function useLocation() {
  const pathname = usePathname() || '/';
  const [search, setSearch] = useState('');
  useEffect(() => {
    setSearch(window.location.search);
  }, [pathname]);
  return useMemo(
    () => ({ pathname, search, hash: '', state: null as unknown, key: 'default' }),
    [pathname, search],
  );
}

type SearchInit = URLSearchParams | string | Record<string, string>;

export function useSearchParams(): [URLSearchParams, (next: SearchInit | ((prev: URLSearchParams) => SearchInit), options?: NavigateOptions) => void] {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const current = useNextSearchParams();
  const params = useMemo(() => new URLSearchParams(current?.toString() ?? ''), [current]);
  const setParams = useCallback(
    (next: SearchInit | ((prev: URLSearchParams) => SearchInit), options?: NavigateOptions) => {
      const value = typeof next === 'function' ? next(new URLSearchParams(params)) : next;
      const qs = new URLSearchParams(value as Record<string, string>).toString();
      const href = qs ? `${pathname}?${qs}` : pathname;
      if (options?.replace) router.replace(href);
      else router.push(href);
    },
    [router, pathname, params],
  );
  return [params, setParams];
}

/** Client-side redirect. Server routes handle canonical/SEO redirects before rendering. */
export function Navigate({ to, replace }: { to: To; replace?: boolean; state?: unknown }) {
  const router = useRouter();
  const href = toHref(to);
  useEffect(() => {
    if (replace) router.replace(href);
    else router.push(href);
  }, [router, href, replace]);
  return null;
}
