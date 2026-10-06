/**
 * Test implementation of '@/lib/router' (aliased in vitest.config.ts): the same API backed by
 * react-router-dom, so component tests can keep rendering inside <MemoryRouter>.
 */
export { Link, NavLink, Navigate, useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
export type { LinkProps, NavLinkProps, NavigateOptions, To } from 'react-router-dom';
