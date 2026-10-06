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

Alternative, if you have Cloudflare access: `deploy/cloudflare-redirects/` contains an equivalent Cloudflare Worker (`npx wrangler deploy`).

### www → non-www (one-time)

`https://mrbedmed.com` is the main domain. Every `www.mrbedmed.com` URL 301s to the same path and query string on the main domain, in one hop. nginx does this; no Cloudflare access is needed. One-time setup on the server:

```sh
sudo bash scripts/setup-www-redirect.sh
```

It removes `www.mrbedmed.com` from the existing bedmed `server_name` lines, adds a redirect-only `server` block for www (ports 80 and 443), backs up to `/root/nginx-backup-www-*`, and restores everything if `nginx -t` fails. It finishes by checking the URLs from the brief through Cloudflare.

### Canonical tag in the page source (one-time)

Every page's HTML source carries `<link rel="canonical" href="https://mrbedmed.com/{path}" />`. The tag uses https and the non-www domain, with no query string or trailing slash. `index.html` holds a placeholder (`<!--mrbedmed:canonical-->`) that nginx `sub_filter` replaces on each request. Only plain URL characters are accepted, so a crafted URL never produces a tag. ID URLs (`/products/{id}`, `/part/{id}`, `/blog/{id}`) 301 to their slug URLs via the redirect sync, so the canonical is always the slug version. In the browser, `CanonicalSync` and `SEOHead` keep the same single tag up to date during navigation.

One-time setup on the server, run after deploying a build that contains the placeholder:

```sh
sudo bash scripts/setup-nginx-canonical.sh
```

It backs up to `/root/nginx-backup-canonical-*`, restores if `nginx -t` fails, and prints the canonical tag from the live page source for Home, a product, a service and a blog post.

## 4. Frontend

```sh
npm ci
npm test
npm run build      # outputs dist/
```

Deploy `dist/` to DigitalOcean the same way as before. The SPA needs every unknown path to serve `index.html`:

- **App Platform (static site):** set *Catchall document* to `index.html`.
- **Droplet + nginx:** `location / { try_files $uri $uri/ /index.html; }`

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

- **Frontend:** redeploy the previous `dist/`. The new columns are additive, so the old frontend keeps working with the migrated database.
- **Worker:** `npx wrangler delete` (or remove its routes).
- **Database:** no rollback is needed for the old frontend. To fully revert, drop the triggers `validate_slug` and `track_slug_redirect` on products, parts, categories, services and blog_posts.
