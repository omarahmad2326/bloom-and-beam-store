-- URL clean-up (SEO brief C4), 2026-10-08. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Duplicate product: /products/stryker-1015-big-wheels-transport-stretcher-1
--    Keep stryker-1015-big-wheels-transport-stretcher (the URL without "-1"),
--    delete the "-1" copy and 301 its URLs (slug and ID) to the kept product.
--    Orders store their items as a copy, so no order references the row.
-- ---------------------------------------------------------------------------
INSERT INTO public.redirects (from_path, to_path, status_code, source)
SELECT v.from_path, '/products/stryker-1015-big-wheels-transport-stretcher', 301, 'manual'
FROM (VALUES
  ('/products/stryker-1015-big-wheels-transport-stretcher-1'),
  ('/products/a7d3e9b2-a37c-487a-ad05-41c40d5029bf')
) AS v(from_path)
WHERE EXISTS (SELECT 1 FROM public.products WHERE slug = 'stryker-1015-big-wheels-transport-stretcher')
ON CONFLICT (from_path) DO UPDATE SET to_path = EXCLUDED.to_path, status_code = 301;

DELETE FROM public.products
WHERE id = 'a7d3e9b2-a37c-487a-ad05-41c40d5029bf'
  AND slug = 'stryker-1015-big-wheels-transport-stretcher-1'
  AND EXISTS (SELECT 1 FROM public.products WHERE slug = 'stryker-1015-big-wheels-transport-stretcher');

-- ---------------------------------------------------------------------------
-- 2. Links inside content point straight at the final URL (no redirect hop).
--    Only the path part is matched, so relative and https://mrbedmed.com/...
--    links are both fixed. "(?![A-Za-z0-9-])" stops /category/icu-bed from
--    matching inside /category/icu-beds.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_content_links(html text)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  IF html IS NULL OR html = '' THEN
    RETURN html;
  END IF;

  -- Old gallery URLs are category pages.
  html := regexp_replace(html, '/gallery/', '/category/', 'gi');

  -- Database-ID URLs -> slug URLs.
  FOR r IN SELECT id::text AS id, slug FROM public.products WHERE slug IS NOT NULL LOOP
    html := replace(html, '/products/' || r.id, '/products/' || r.slug);
  END LOOP;
  FOR r IN SELECT id::text AS id, slug FROM public.parts WHERE slug IS NOT NULL LOOP
    html := replace(html, '/part/' || r.id, '/part/' || r.slug);
  END LOOP;
  FOR r IN SELECT id::text AS id, slug FROM public.blog_posts WHERE slug IS NOT NULL LOOP
    html := replace(html, '/blog/' || r.id, '/blog/' || r.slug);
  END LOOP;

  -- Category links in any letter case -> the category's lowercase slug.
  FOR r IN SELECT slug FROM public.categories WHERE slug IS NOT NULL LOOP
    html := regexp_replace(html, '/category/' || r.slug || '(?![A-Za-z0-9-])', '/category/' || r.slug, 'gi');
  END LOOP;

  -- Recorded redirects (renamed slugs, deleted duplicates, /category/icu-bed -> icu-beds).
  FOR r IN
    SELECT from_path, to_path FROM public.redirects
    WHERE from_path ~ '^/(products|part|blog|category|services)/[A-Za-z0-9-]+$'
  LOOP
    html := regexp_replace(html, r.from_path || '(?![A-Za-z0-9-])', r.to_path, 'gi');
  END LOOP;

  RETURN html;
END;
$$;

UPDATE public.blog_posts
SET content = public.normalize_content_links(content),
    canonical_url = public.normalize_content_links(canonical_url)
WHERE content IS DISTINCT FROM public.normalize_content_links(content)
   OR canonical_url IS DISTINCT FROM public.normalize_content_links(canonical_url);

UPDATE public.products SET description = public.normalize_content_links(description)
WHERE description IS DISTINCT FROM public.normalize_content_links(description);

UPDATE public.site_pages SET content_html = public.normalize_content_links(content_html)
WHERE content_html IS DISTINCT FROM public.normalize_content_links(content_html);
