# Mrbedmed (mrbedmed.com)

Website and admin dashboard for Mrbedmed: hospital beds, stretchers, parts and biomedical services.

- **Frontend:** Next.js (App Router, server-rendered) + React 19 + TypeScript, Tailwind + shadcn/ui, React Query
- **Backend:** Supabase (Postgres + RLS, Auth, Storage, Edge Functions), project `xgzjppyfkfjnwdrxpnpz`
- **Hosting:** DigitalOcean droplet: the Next.js server runs under pm2 (`mrbedmed`, 127.0.0.1:3100) and nginx proxies to it from `/var/www/bedmed`; Cloudflare sits in front

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
| `npm run build` | Production build into `.next/` |
| `npm start` | Run the production build |
| `npm test` | Unit/component tests (Vitest + jsdom) |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |

## Project layout

```
src/
  app/                Next.js routes: each page fetches its data on the server, sets metadata
                      (title, description, canonical) and renders the view; admin/ = dashboard
  views/              page components (client); views/admin/ = dashboard screens (browser-only)
  queries/            shared React Query definitions (used on the server and in the browser)
  lib/server/         server helpers: per-request QueryClient, metadata, redirect-or-404
  lib/router.tsx      small react-router-style API (Link, useNavigate, ...) on top of next/navigation
  components/admin/   editor building blocks: RichTextEditor, SlugField, SeoFields, ListEditor, image uploads
  components/seo/     JsonLd / BreadcrumbSchema (structured data, rendered into the HTML)
  components/RichContent.tsx       safe renderer for editor content (HTML, or legacy Markdown)
  components/RedirectOrFallback.tsx  in-app fallback for redirected URLs
  lib/                slugify, content (sanitize/plain text), schema builders, redirects, site constants
supabase/
  migrations/         schema history; apply with the Supabase CLI
  functions/          edge functions: sitemap, send-email
deploy/
  cloudflare-redirects/  optional Cloudflare Worker alternative for 301s
scripts/
  deploy-server.sh          release script run on the droplet
  next-release.sh           build + swap + pm2 reload (used by deploy-server.sh)
  setup-next-server.sh      one-time switch of nginx to the Next.js server
  setup-nginx-redirects.sh  one-time nginx 301 setup
  sync-redirects.mjs        redirects table -> nginx map (cron, every minute)
docs/
  DEPLOYMENT.md       release runbook
```

## Content management conventions

- **Rich text.** Descriptions, blog content, service overviews and category intros are edited with the TipTap editor and stored as HTML. Content saved before the editor existed is Markdown; `lib/content.ts` converts it on read, so both work. All rendering goes through `RichContent`, which sanitizes with DOMPurify.
- **Slugs.** Products, parts, categories, services and blog posts share one rule: lowercase `a–z`, `0–9`, single hyphens, max 75 characters. The slug auto-fills from the title on create and stays editable. Duplicates are blocked with "This slug is already used.", and nothing appends `-1`. The database enforces the format (`validate_slug` trigger) and uniqueness (unique indexes).
- **Redirects.** When the slug of a published item changes, the `track_slug_redirect` trigger records `old URL → new URL` (301) in `public.redirects` and flattens chains. Admins can view and add redirects in **Dashboard → Redirects**. nginx on the droplet serves them as real 301s (synced every minute by `scripts/sync-redirects.mjs`); the app also returns them (308) for any URL the map has not picked up yet.
- **Structured data.** Product and part pages output `Product`. Service pages output `Service`, with the provider taken from Dashboard → Contact Info. Blog posts output `BlogPosting`. Inner pages output `BreadcrumbList`, and category FAQs output `FAQPage`. Each editor also has a validated "Custom schema (JSON-LD)" box. Builders live in `lib/schema.ts`.
- **Editable pages.** About Us and Contact Us are section-based pages edited in Dashboard → About Page / Contact Page (stored in `site_settings`); empty sections are hidden. Legal and other simple pages live in `public.site_pages` (Dashboard → Pages), are served at `/{slug}`, and appear in the footer when "Show in footer" is on. Slugs that clash with app routes are blocked (`lib/sitePages.ts` mirrors the DB constraint).
- **SEO fields.** Every editor has Meta Title (60), Meta Description (160) and ALT text for its images. Empty fields fall back to sensible defaults.
- **Recently Deleted.** Deleting anything in the dashboard (products, parts, services, categories, blog posts, FAQs, pages, home cards and menu items, redirects, orders, messages, newsletter subscribers and newsletters) copies it to `public.deleted_items` (trigger `capture_deleted_row`). Dashboard → Recently Deleted restores it with the same id (so URLs, images and order links keep working) or deletes it for good. Items are purged after 7 days.
- **Newsletter.** The footer form posts to `/api/newsletter/subscribe`. It adds the address to `newsletter_subscribers` and sends one welcome email. Admins write newsletters in Dashboard → Newsletter (rich text, preview, test send) and send them to every subscribed address through Resend (`src/lib/server/newsletter.ts`, batches of 100). Every email has an unsubscribe link (`/newsletter/unsubscribe`), one-click List-Unsubscribe headers and the postal address from Contact Info. Server settings: `RESEND_API_KEY`, `NEWSLETTER_FROM` and an optional `NEWSLETTER_REPLY_TO`, set with `scripts/setup-newsletter.sh`.

## Database changes

Never change the schema from the Supabase dashboard. Add a migration instead:

```sh
npx supabase migration new <name>   # writes supabase/migrations/<timestamp>_<name>.sql
npx supabase db push                # applies pending migrations to the linked project
```

After a schema change, update `src/integrations/supabase/types.ts`
(`npx supabase gen types typescript --project-id xgzjppyfkfjnwdrxpnpz > src/integrations/supabase/types.ts`).

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full release process.
