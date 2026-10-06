# Mrbedmed (mrbedmed.com)

Website and admin dashboard for Mrbedmed: hospital beds, stretchers, parts and biomedical services.

- **Frontend:** Vite + React 18 + TypeScript, Tailwind + shadcn/ui, React Query, React Router
- **Backend:** Supabase (Postgres + RLS, Auth, Storage, Edge Functions), project `xgzjppyfkfjnwdrxpnpz`
- **Hosting:** DigitalOcean (static build), Cloudflare in front (edge redirects)

> The project was originally generated with Lovable. It is no longer edited there; all changes go through this repository.

## Getting started

```sh
npm install
cp .env.example .env      # fill in VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev               # http://localhost:8080
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build into `dist/` |
| `npm test` | Unit/component tests (Vitest + jsdom) |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |

## Project layout

```
src/
  pages/              public pages; pages/admin/ = dashboard (lazy-loaded)
  components/admin/   editor building blocks: RichTextEditor, SlugField, SeoFields, ListEditor, image uploads
  components/seo/     SEOHead (meta tags), JsonLd / BreadcrumbSchema (structured data)
  components/RichContent.tsx       safe renderer for editor content (HTML, or legacy Markdown)
  components/RedirectOrFallback.tsx  in-app fallback for redirected URLs
  lib/                slugify, content (sanitize/plain text), schema builders, redirects, site constants
supabase/
  migrations/         schema history; apply with the Supabase CLI
  functions/          edge functions: sitemap, send-email
deploy/
  cloudflare-redirects/  Cloudflare Worker serving real 301s from the redirects table
docs/
  DEPLOYMENT.md       release runbook
```

## Content management conventions

- **Rich text.** Descriptions, blog content, service overviews and category intros are edited with the TipTap editor and stored as HTML. Content saved before the editor existed is Markdown; `lib/content.ts` converts it on read, so both work. All rendering goes through `RichContent`, which sanitizes with DOMPurify.
- **Slugs.** Products, parts, categories, services and blog posts share one rule: lowercase `a–z`, `0–9`, single hyphens, max 75 characters. The slug auto-fills from the title on create and stays editable. Duplicates are blocked with "This slug is already used.", and nothing appends `-1`. The database enforces the format (`validate_slug` trigger) and uniqueness (unique indexes).
- **Redirects.** When the slug of a published item changes, the `track_slug_redirect` trigger records `old URL → new URL` (301) in `public.redirects` and flattens chains. Admins can view and add redirects in **Dashboard → Redirects**. The Cloudflare Worker serves them as real 301s; the SPA also follows them client-side as a fallback.
- **Structured data.** Product and part pages output `Product`. Service pages output `Service`, with the provider taken from Dashboard → Contact Info. Blog posts output `BlogPosting`. Inner pages output `BreadcrumbList`, and category FAQs output `FAQPage`. Each editor also has a validated "Custom schema (JSON-LD)" box. Builders live in `lib/schema.ts`.
- **SEO fields.** Every editor has Meta Title (60), Meta Description (160) and ALT text for its images. Empty fields fall back to sensible defaults.

## Database changes

Never change the schema from the Supabase dashboard. Add a migration instead:

```sh
npx supabase migration new <name>   # writes supabase/migrations/<timestamp>_<name>.sql
npx supabase db push                # applies pending migrations to the linked project
```

After a schema change, update `src/integrations/supabase/types.ts`
(`npx supabase gen types typescript --project-id xgzjppyfkfjnwdrxpnpz > src/integrations/supabase/types.ts`).

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full release process.
