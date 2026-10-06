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

## 3. Edge redirects (Cloudflare Worker)

1. Put the publishable (anon) key in `deploy/cloudflare-redirects/wrangler.toml` → `SUPABASE_ANON_KEY`.
2. Confirm the `mrbedmed.com` DNS record is **proxied** (orange cloud) in Cloudflare.
3. Deploy:

```sh
cd deploy/cloudflare-redirects
npx wrangler deploy
```

If the site is not behind Cloudflare, the 301s must come from the origin instead (for example, nginx on the droplet). The in-app fallback still sends visitors to the new URL, but it is a client-side redirect, not a 301.

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

- `/category/icu-bed` lists its products. `/category/ICU-bed` 301s to the lowercase URL.
- Two categories show different text. Empty sections are hidden.
- Category pages are now edited in Dashboard → Categories. Categories that had no specific copy before (and the newly created ICU Bed category) show only the hero, products and quote box until someone fills in their content.

## Rollback

- **Frontend:** redeploy the previous `dist/`. The new columns are additive, so the old frontend keeps working with the migrated database.
- **Worker:** `npx wrangler delete` (or remove its routes).
- **Database:** no rollback is needed for the old frontend. To fully revert, drop the triggers `validate_slug` and `track_slug_redirect` on products, parts, categories, services and blog_posts.
