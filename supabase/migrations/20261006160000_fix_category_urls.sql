-- Fix category URLs found in production data (2026-10-06).

-- The old sitemap and Google index point at /category/ICU-bed; the category's slug is icu-beds.
INSERT INTO public.redirects (from_path, to_path, status_code, source)
SELECT '/category/icu-bed', '/category/icu-beds', 301, 'manual'
WHERE EXISTS (SELECT 1 FROM public.categories WHERE slug = 'icu-beds')
  AND NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = 'icu-bed')
ON CONFLICT (from_path) DO NOTHING;

-- Legacy slug with a capital letter; the track_slug_redirect trigger records
-- /category/Chair-stretcher -> /category/chair-stretcher automatically.
UPDATE public.categories
SET slug = 'chair-stretcher'
WHERE slug = 'Chair-stretcher'
  AND NOT EXISTS (SELECT 1 FROM public.categories WHERE slug = 'chair-stretcher');
