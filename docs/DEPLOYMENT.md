# Release runbook: CMS & SEO upgrade

This release adds the rich-text editor, SEO and ALT fields, the slug rules, automatic 301 redirects, the Redirects screen, automatic structured data and per-category page content.

Run the steps **in order**. Step 1 must come before step 4: the new frontend reads columns that the migration creates.

## 0. Prerequisites

- Supabase CLI access to project `xgzjppyfkfjnwdrxpnpz` (`npx supabase login`, then `npx supabase link --project-ref xgzjppyfkfjnwdrxpnpz`)
- Cloudflare access to the `mrbedmed.com` zone (`npx wrangler login`)
- Access to the DigitalOcean app/droplet that serves the site

## 1. Database migration

Migration file: `supabase/migrations/20261006120000_cms_seo_upgrade.sql`. It is additive and safe to re-run.

```sh
npx supabase db push --dry-run   # should list only 20261006120000_cms_seo_upgrade.sql
npx supabase db push
```

What it does:

- Adds columns: SEO, ALT text, custom schema, product brand and short description, service cities, blog `published_at`, and the category page sections.
- Creates `public.redirects` (public read; only admins can write).
- Adds triggers: slug format validation, and automatic redirects when a published slug changes.
- Backfills:
  - service overview → HTML
  - blog `published_at`
  - a category row for every home-menu item or product category name that lacked one (this fixes `/category/icu-bed`)
  - `products.category_id`
  - the previous hard-coded category copy into the matching categories

Recommended: take a backup first (Supabase → Database → Backups).

## 2. Sitemap edge function

```sh
npx supabase functions deploy sitemap
```

The sitemap now lists categories and services from the database and always uses `https://mrbedmed.com`. The hard-coded `/category/ICU-bed` entry is gone.

## 3. Real 301 redirects (nginx on the droplet)

The site sits behind Cloudflare, but 301s are served by **nginx on the droplet** and Cloudflare passes them through, so no Cloudflare access is needed.

One-time setup, on the server from `/var/www/bedmed`:

```sh
sudo bash scripts/setup-nginx-redirects.sh
```

It installs an nginx `map` that `scripts/sync-redirects.mjs` generates from the `redirects` table, adds a one-line rule to the server block that serves `/var/www/bedmed`, and installs a cron job that re-syncs every minute (log: `/var/log/mrbedmed-redirects.log`). Config files are backed up to `/root/nginx-backup-*`, and if `nginx -t` fails everything is restored. Category URLs in any letter case 301 to lowercase.

After the setup, `scripts/deploy-server.sh` syncs the map on every release.

The map has long keys (ID and blog URLs), so the setup also writes `conf.d/00-mrbedmed-map-hash.conf` with `map_hash_bucket_size 256; map_hash_max_size 8192;`. These directives must come before the first `map` block anywhere in nginx, and other sites on the server have maps of their own; the `00-` prefix makes the file load first. The file is skipped if another config already sets these values.

Alternative, if you have Cloudflare access: `deploy/cloudflare-redirects/` contains an equivalent Cloudflare Worker (`npx wrangler deploy`).

### www → non-www (one-time)

`https://mrbedmed.com` is the main domain. Every `www.mrbedmed.com` URL 301s to the same path and query string on the main domain, in one hop. nginx does this; no Cloudflare access is needed. One-time setup on the server:

```sh
sudo bash scripts/setup-www-redirect.sh
```

It removes `www.mrbedmed.com` from the existing bedmed `server_name` lines, adds a redirect-only `server` block for www (ports 80 and 443), backs up to `/root/nginx-backup-www-*`, and restores everything if `nginx -t` fails. It finishes by checking the URLs from the brief through Cloudflare.

## 4. Website (Next.js, server-rendered)

The site is a Next.js app. Every page is rendered on the server, so the HTML that browsers, View Page Source and Google receive already contains the page's title, meta description, canonical tag, structured data, H1, text, prices and links. The browser then takes over (hydration) for the cart, search and the dashboard.

On the droplet the app runs under **pm2** as `mrbedmed` on `127.0.0.1:3100` (only reachable through nginx). nginx serves the files in `public/` (images, robots.txt, favicon) directly and proxies everything else, including `/_next/` assets, to the app. The redirect map (section 3) still runs first in nginx, so its 301s come before the app.

### One-time switch-over

On the server, from `/var/www/bedmed`:

```sh
git pull --ff-only origin main
sudo bash scripts/setup-next-server.sh
```

The script:

1. Checks Node 20.9+, pm2, python3, `.env` and that port 3100 is free (`MRBEDMED_PORT=3200 sudo -E bash …` picks another port).
2. Builds into `.next-build` while the old site keeps serving, swaps it into `.next` and starts pm2 (`ecosystem.config.cjs`), then `pm2 save`. A health check on the local port must return HTML with an `<h1>`.
3. Backs up the nginx configs whose `root` is `/var/www/bedmed` to `/root/nginx-backup-next-*`. It rewrites only those server blocks (`scripts/nginx-next-proxy.py`): `root` becomes `/var/www/bedmed/public` and the old `location` blocks are replaced by the proxy locations. It keeps `listen`, `server_name`, the certificates and the redirect rule, and removes the old canonical `sub_filter` and `conf.d/mrbedmed-canonical.conf`. Other sites on the server are not touched.
4. Runs `nginx -t`, reloads nginx, then checks the live site through Cloudflare: the product page source has the name, price, canonical and Product schema, unknown pages return 404, and the sitemap, robots.txt and a `/_next/static` asset load. If any check fails, the nginx config is restored and the previous static site is back.

### Every release

`scripts/deploy-server.sh` (migration, redirects, then `scripts/next-release.sh`). For code-only releases:

```sh
git pull --ff-only origin main && bash scripts/next-release.sh
```

`next-release.sh` runs `npm ci` only when `package-lock.json` changed. It builds into `.next-build` while the live site keeps running, swaps the build in and reloads pm2, which takes a second or two. If the new build does not answer, it puts the previous build back.

Useful commands: `pm2 status`, `pm2 logs mrbedmed`, `pm2 reload mrbedmed`.

### Canonical tag

Every page's `<link rel="canonical">` is rendered by the server (`generateMetadata` in `src/app`, helpers in `src/lib/server/metadata.ts`). It uses `https://mrbedmed.com` with no query string or trailing slash. ID URLs (`/products/{id}`, `/part/{id}`, `/blog/{id}`) redirect to the slug URL (nginx 301 from the redirect map, or 308 from the app), so the canonical always shows the slug version. Account pages (cart, checkout, orders, auth, account) and the dashboard are `noindex`.

### Local development

```sh
npm run dev                     # http://localhost:8080
npm run build && npm start      # production server on :3000
```

`.env` may use either `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` (the server's existing file) or the `NEXT_PUBLIC_` names. `next.config.mjs` maps them.

### Newsletter email (one-time)

The newsletter sends through Resend. The sending domain must be verified in Resend → Domains (the DNS records). Then, on the server:

```sh
cd /var/www/bedmed && bash scripts/setup-newsletter.sh
```

The script asks for the API key (the input is hidden) and lists the domains verified in Resend. It then asks for the sender address and saves `RESEND_API_KEY`, `NEWSLETTER_FROM` and `NEWSLETTER_REPLY_TO` in `.env`, which only root can read. It restarts the site and can send a test email. Re-run it to change the key or the sender.

## 5. Post-deploy checks (acceptance criteria)

### Slugs and redirects

1. In Dashboard → Products, create a product titled **Test Bed 2**. The slug field fills in `test-bed-2`.
2. Create a second product with the same slug. Saving is blocked with **"This slug is already used."**
3. Change the first product's slug to `test-bed-2-renamed` and save. Dashboard → Redirects shows `/products/test-bed-2 → /products/test-bed-2-renamed` (301, Automatic).
4. Check the header:

   ```sh
   curl -sI https://mrbedmed.com/products/test-bed-2 | grep -iE "^(HTTP|location)"
   # HTTP/2 301
   # location: https://mrbedmed.com/products/test-bed-2-renamed
   ```

5. Delete the test product and its redirect.

### Structured data

- Product: https://search.google.com/test/rich-results?url=https://mrbedmed.com/products/stryker-1007-stretcher should report "Product" with no errors. Before testing, make sure the product has a **Brand**, a **Short Description** and a main image.
- Service and blog post: run https://validator.schema.org/ on `/services/equipment-rental` and a blog post. Fill in **Cities Served** on each service, and check Dashboard → Contact Info → Business Address & Logo.

### Category pages

- `/category/icu-beds` lists its products. The old `/category/ICU-bed` 301s to it.
- Two categories show different text. Empty sections are hidden.
- Category pages are now edited in Dashboard → Categories. Categories that had no specific copy before (and the newly created ICU Bed category) show only the hero, products and quote box until someone fills in their content.

## Rollback

- **Website:** `git checkout <previous commit> && bash scripts/next-release.sh`. To go back to the old static site entirely, restore the files from `/root/nginx-backup-next-*`, run `nginx -s reload`, then `pm2 delete mrbedmed`. The old `dist/` stays on disk. The database columns are additive, so either frontend works with the migrated database.
- **Worker:** `npx wrangler delete` (or remove its routes).
- **Database:** no rollback is needed for the old frontend. To fully revert, drop the triggers `validate_slug` and `track_slug_redirect` on products, parts, categories, services and blog_posts.
