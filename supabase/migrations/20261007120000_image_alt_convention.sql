-- ALT text convention from this release on:
--   NULL = not entered yet (the site falls back to the item's name)
--   ''   = marked "Decorative image" in the dashboard (outputs alt="")
-- Before this release blank ALT fields were saved as '' in gallery arrays, meaning "not entered".
-- No image could be marked decorative yet, so every existing '' becomes NULL.

UPDATE public.products SET image_alts = array_replace(image_alts, '', NULL) WHERE '' = ANY (image_alts);
UPDATE public.parts    SET image_alts = array_replace(image_alts, '', NULL) WHERE '' = ANY (image_alts);

UPDATE public.products   SET image_alt = NULL WHERE image_alt = '';
UPDATE public.blog_posts SET image_alt = NULL WHERE image_alt = '';
UPDATE public.categories SET image_alt = NULL WHERE image_alt = '';
UPDATE public.services   SET image_alt = NULL WHERE image_alt = '';
