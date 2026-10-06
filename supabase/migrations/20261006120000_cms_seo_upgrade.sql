-- CMS & SEO upgrade
--   * Rich-text, SEO (meta title/description), image ALT and custom JSON-LD fields
--   * Per-category page content
--   * Product brand / short description, service areas served, blog publish date
--   * Slug format validation + automatic 301 redirects when a published slug changes
--   * redirects table (managed from Dashboard -> Redirects)

-- ---------------------------------------------------------------------------
-- 1. New columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS image_alt text,
  ADD COLUMN IF NOT EXISTS image_alts text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS custom_schema text;

ALTER TABLE public.parts
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS image_alts text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS custom_schema text;

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS image_alt text,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS custom_schema text;

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS overview_html text,
  ADD COLUMN IF NOT EXISTS areas_served text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS image_alt text,
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS custom_schema text;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS intro_html text,
  ADD COLUMN IF NOT EXISTS why_choose text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS key_features text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS benefits text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ideal_for text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS faqs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cta_title text,
  ADD COLUMN IF NOT EXISTS cta_text text,
  ADD COLUMN IF NOT EXISTS image_alt text,
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS custom_schema text;

-- ---------------------------------------------------------------------------
-- 2. Backfills
-- ---------------------------------------------------------------------------

-- Services: convert the legacy paragraph array into rich-text HTML.
UPDATE public.services s
SET overview_html = (
  SELECT string_agg(
    '<p>' || replace(replace(replace(p, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</p>',
    '' ORDER BY ord)
  FROM unnest(s.overview) WITH ORDINALITY AS t(p, ord)
)
WHERE s.overview_html IS NULL AND cardinality(s.overview) > 0;

-- Blog: published date defaults to creation date for already-published posts.
UPDATE public.blog_posts SET published_at = created_at
WHERE published AND published_at IS NULL;

-- Every home-menu category link and every category name used by a product gets a real,
-- editable category row (category pages are now driven by the categories table).
CREATE OR REPLACE FUNCTION pg_temp.make_slug(src text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT trim(both '-' from left(
    trim(both '-' from regexp_replace(regexp_replace(lower(src), '[^a-z0-9\s-]', '', 'g'), '[\s-]+', '-', 'g')),
    75))
$$;

INSERT INTO public.categories (name, slug, sort_order)
SELECT name, slug, 100 FROM (
  SELECT DISTINCT ON (lower(trim(i.name)))
    trim(i.name) AS name,
    CASE WHEN lower(i.slug) ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(i.slug) <= 75
         THEN lower(i.slug) ELSE pg_temp.make_slug(i.name) END AS slug
  FROM public.home_service_card_items i
  WHERE NOT EXISTS (SELECT 1 FROM public.categories c WHERE lower(trim(c.name)) = lower(trim(i.name)))
) s
WHERE s.slug <> ''
ON CONFLICT DO NOTHING;

INSERT INTO public.categories (name, slug, sort_order)
SELECT name, slug, 200 FROM (
  SELECT DISTINCT ON (lower(trim(p.category)))
    trim(p.category) AS name,
    pg_temp.make_slug(p.category) AS slug
  FROM public.products p
  WHERE trim(p.category) <> ''
    AND NOT EXISTS (SELECT 1 FROM public.categories c WHERE lower(trim(c.name)) = lower(trim(p.category)))
) s
WHERE s.slug <> ''
ON CONFLICT DO NOTHING;

-- Products: link to categories table by name where the FK is missing.
UPDATE public.products p
SET category_id = c.id
FROM public.categories c
WHERE p.category_id IS NULL AND lower(trim(p.category)) = lower(trim(c.name));

-- Keep blog published_at in sync: set on first publish.
CREATE OR REPLACE FUNCTION public.set_blog_published_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.published AND NEW.published_at IS NULL THEN
    NEW.published_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_blog_published_at ON public.blog_posts;
CREATE TRIGGER set_blog_published_at
  BEFORE INSERT OR UPDATE OF published ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_blog_published_at();

-- ---------------------------------------------------------------------------
-- 3. Redirects
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_path text NOT NULL UNIQUE CHECK (from_path ~ '^/'),
  to_path text NOT NULL CHECK (to_path ~ '^(/|https?://)'),
  status_code smallint NOT NULL DEFAULT 301 CHECK (status_code IN (301, 302, 307, 308)),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('auto', 'manual')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_path <> to_path)
);

ALTER TABLE public.redirects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view redirects" ON public.redirects;
CREATE POLICY "Anyone can view redirects"
  ON public.redirects FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage redirects" ON public.redirects;
CREATE POLICY "Admins can manage redirects"
  ON public.redirects FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT ON public.redirects TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.redirects TO authenticated;

DROP TRIGGER IF EXISTS update_redirects_updated_at ON public.redirects;
CREATE TRIGGER update_redirects_updated_at
  BEFORE UPDATE ON public.redirects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 4. Slug validation (only when a slug is set or changed, so legacy rows stay editable)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.slug IS DISTINCT FROM OLD.slug)
     AND (NEW.slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' OR length(NEW.slug) > 75) THEN
    RAISE EXCEPTION 'Invalid slug "%": use only lowercase a-z, 0-9 and single hyphens, max 75 characters', NEW.slug
      USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Automatic redirects when a published item's slug changes
--    TG_ARGV[0] = URL prefix (e.g. '/products/')
--    TG_ARGV[1] = 'true' if the table has a `published` column that gates redirects
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.track_slug_redirect()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix text := TG_ARGV[0];
  has_published boolean := coalesce(TG_ARGV[1], 'false')::boolean;
  was_published boolean;
  old_path text;
  new_path text;
BEGIN
  IF NEW.slug IS NULL THEN
    RETURN NEW;
  END IF;

  new_path := prefix || NEW.slug;

  -- A live URL must never redirect away from itself (also prevents loops when an
  -- item is renamed back to a previous slug). Must run before chain flattening.
  DELETE FROM public.redirects WHERE from_path = new_path;

  IF TG_OP = 'UPDATE' AND OLD.slug IS NOT NULL AND OLD.slug IS DISTINCT FROM NEW.slug THEN
    IF has_published THEN
      was_published := (to_jsonb(OLD) ->> 'published')::boolean;
    ELSE
      was_published := true;
    END IF;

    IF was_published THEN
      old_path := prefix || OLD.slug;

      -- Flatten chains: anything that pointed at the old URL now points at the new one.
      UPDATE public.redirects SET to_path = new_path WHERE to_path = old_path;

      INSERT INTO public.redirects (from_path, to_path, status_code, source)
      VALUES (old_path, new_path, 301, 'auto')
      ON CONFLICT (from_path) DO UPDATE
        SET to_path = EXCLUDED.to_path, status_code = 301, source = 'auto';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT * FROM (VALUES
      ('products',   '/products/', 'false'),
      ('parts',      '/part/',     'false'),
      ('categories', '/category/', 'false'),
      ('services',   '/services/', 'true'),
      ('blog_posts', '/blog/',     'true')
    ) AS v(tbl, prefix, has_published)
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS validate_slug ON public.%I', t.tbl);
    EXECUTE format(
      'CREATE TRIGGER validate_slug BEFORE INSERT OR UPDATE OF slug ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.validate_slug()', t.tbl);

    EXECUTE format('DROP TRIGGER IF EXISTS track_slug_redirect ON public.%I', t.tbl);
    EXECUTE format(
      'CREATE TRIGGER track_slug_redirect AFTER INSERT OR UPDATE OF slug ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.track_slug_redirect(%L, %L)',
      t.tbl, t.prefix, t.has_published);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 6. Seed per-category page content from the previously hard-coded copy
--    (only fills empty fields; the generic fallback copy is intentionally not migrated)
-- ---------------------------------------------------------------------------
UPDATE public.categories SET
  intro_html = COALESCE(NULLIF(intro_html, ''), '<p>Manual hospital beds are the foundation of patient care, offering reliable and cost-effective solutions for healthcare facilities of all sizes. These traditional beds feature hand-crank mechanisms for adjusting bed height, head elevation, and foot positioning, ensuring patients receive comfortable care without dependency on electrical systems.</p><p>Our manual hospital beds are constructed with high-grade steel frames and premium materials, designed to withstand years of intensive use while maintaining optimal patient comfort and safety standards.</p>'),
  why_choose = CASE WHEN cardinality(why_choose) = 0 THEN ARRAY['ISO Certified Quality', 'Quick Turnaround Time', 'Easy Maintenance', 'Industry-Leading Warranty']::text[] ELSE why_choose END,
  key_features = CASE WHEN cardinality(key_features) = 0 THEN ARRAY['Hand-crank height adjustment', 'Manual head and foot positioning', 'Durable steel frame construction', 'Locking caster wheels', 'Side rail compatibility']::text[] ELSE key_features END,
  benefits = CASE WHEN cardinality(benefits) = 0 THEN ARRAY['Cost-effective solution', 'No electricity required', 'Simple operation', 'Low maintenance', 'Reliable performance']::text[] ELSE benefits END,
  ideal_for = CASE WHEN cardinality(ideal_for) = 0 THEN ARRAY['Long-term care facilities', 'Rural healthcare settings', 'Backup beds for power outages', 'Budget-conscious facilities']::text[] ELSE ideal_for END
WHERE lower(slug) = 'manual-hospital-beds';

UPDATE public.categories SET
  intro_html = COALESCE(NULLIF(intro_html, ''), '<p>Semi-electric hospital beds combine the convenience of electric controls with manual reliability. These beds feature motorized head and foot adjustments controlled by a handheld pendant, while maintaining manual crank operation for height adjustment, providing an ideal balance of functionality and cost-efficiency.</p><p>Perfect for facilities seeking to upgrade from fully manual beds, semi-electric models offer patients greater independence in adjusting their comfort positions while keeping equipment costs manageable.</p>'),
  why_choose = CASE WHEN cardinality(why_choose) = 0 THEN ARRAY['Balanced Cost & Features', 'Patient-Controlled Comfort', 'Reduced Caregiver Strain', 'Energy Efficient Design']::text[] ELSE why_choose END,
  key_features = CASE WHEN cardinality(key_features) = 0 THEN ARRAY['Electric head and foot controls', 'Manual crank height adjustment', 'Pendant controller', 'Battery backup option', 'Quiet motor operation']::text[] ELSE key_features END,
  benefits = CASE WHEN cardinality(benefits) = 0 THEN ARRAY['Balance of cost and convenience', 'Patient-controlled positioning', 'Reduced caregiver strain', 'Energy efficient']::text[] ELSE benefits END,
  ideal_for = CASE WHEN cardinality(ideal_for) = 0 THEN ARRAY['Nursing homes', 'Rehabilitation centers', 'Home healthcare', 'Assisted living facilities']::text[] ELSE ideal_for END
WHERE lower(slug) = 'semi-electric-hospital-beds';

UPDATE public.categories SET
  intro_html = COALESCE(NULLIF(intro_html, ''), '<p>Fully electric hospital beds represent the pinnacle of patient care technology, offering complete motorized control over all bed positions. With the touch of a button, caregivers and patients can adjust height, head, foot, and Trendelenburg positions, maximizing comfort and minimizing physical strain.</p><p>Our fully electric beds feature advanced safety systems, programmable positions, and optional integrated scales, making them ideal for acute care environments where precision and efficiency are paramount.</p>'),
  why_choose = CASE WHEN cardinality(why_choose) = 0 THEN ARRAY['Maximum Convenience', 'Quick Position Changes', 'Advanced Safety Features', 'Premium Construction']::text[] ELSE why_choose END,
  key_features = CASE WHEN cardinality(key_features) = 0 THEN ARRAY['Full electric controls', 'Programmable positions', 'Trendelenburg capability', 'Low height function', 'Integrated scale option']::text[] ELSE key_features END,
  benefits = CASE WHEN cardinality(benefits) = 0 THEN ARRAY['Maximum convenience', 'Reduced injury risk', 'Patient independence', 'Precise positioning']::text[] ELSE benefits END,
  ideal_for = CASE WHEN cardinality(ideal_for) = 0 THEN ARRAY['Acute care hospitals', 'ICU settings', 'Post-surgical care', 'Specialty clinics']::text[] ELSE ideal_for END
WHERE lower(slug) = 'fully-electric-hospital-beds';

UPDATE public.categories SET
  intro_html = COALESCE(NULLIF(intro_html, ''), '<p>ICU and Critical Care beds are engineered for the most demanding healthcare environments. These specialized beds provide 360-degree patient access, integrated monitoring capabilities, and advanced therapeutic features essential for intensive care settings.</p><p>Designed to support life-saving interventions, our ICU beds feature CPR functions, X-ray translucent decks, and lateral rotation therapy to optimize patient outcomes in critical situations.</p>'),
  why_choose = CASE WHEN cardinality(why_choose) = 0 THEN ARRAY['360° Patient Access', 'Rapid Response Features', 'Integrated Monitoring', 'Clinical Excellence']::text[] ELSE why_choose END,
  key_features = CASE WHEN cardinality(key_features) = 0 THEN ARRAY['360° patient access', 'Integrated monitoring', 'CPR function', 'X-ray translucent deck', 'Lateral rotation therapy']::text[] ELSE key_features END,
  benefits = CASE WHEN cardinality(benefits) = 0 THEN ARRAY['Enhanced patient care', 'Improved clinical outcomes', 'Caregiver efficiency', 'Infection control features']::text[] ELSE benefits END,
  ideal_for = CASE WHEN cardinality(ideal_for) = 0 THEN ARRAY['Intensive Care Units', 'Cardiac Care Units', 'Trauma centers', 'Emergency departments']::text[] ELSE ideal_for END
WHERE lower(slug) = 'icu-critical-care-beds';

UPDATE public.categories SET
  intro_html = COALESCE(NULLIF(intro_html, ''), '<p>Low beds are specifically designed to minimize fall-related injuries for high-risk patients. With deck heights that can reach as low as 7-8 inches from the floor, these beds significantly reduce the impact distance if a patient does fall, protecting vulnerable individuals.</p><p>Equipped with built-in alarm systems and high-visibility side rails, our low beds provide comprehensive fall prevention solutions while maintaining the full range of positioning capabilities needed for quality patient care.</p>'),
  why_choose = CASE WHEN cardinality(why_choose) = 0 THEN ARRAY['Ultra-Low Height Design', 'Rapid Alert Systems', 'Safety-First Engineering', 'Regulatory Compliant']::text[] ELSE why_choose END,
  key_features = CASE WHEN cardinality(key_features) = 0 THEN ARRAY['Ultra-low deck height (7-8 inches)', 'Floor-level capability', 'Built-in alarm systems', 'Soft-touch bumpers', 'High-visibility side rails']::text[] ELSE key_features END,
  benefits = CASE WHEN cardinality(benefits) = 0 THEN ARRAY['Reduced fall injuries', 'Patient safety', 'Peace of mind for caregivers', 'Regulatory compliance']::text[] ELSE benefits END,
  ideal_for = CASE WHEN cardinality(ideal_for) = 0 THEN ARRAY['Dementia care units', 'Fall-risk patients', 'Psychiatric facilities', 'Senior care homes']::text[] ELSE ideal_for END
WHERE lower(slug) = 'low-beds-fall-prevention';

UPDATE public.categories SET
  intro_html = COALESCE(NULLIF(intro_html, ''), '<p>Bariatric hospital beds are engineered to safely and comfortably accommodate larger patients with weight capacities ranging from 600 to 1000+ pounds. These heavy-duty beds feature reinforced frames, extra-wide sleep surfaces, and specialized motors designed for extended durability.</p><p>Our bariatric beds prioritize patient dignity and caregiver safety, with ergonomic designs that facilitate safe patient handling while providing the same comfort and positioning options as standard hospital beds.</p>'),
  why_choose = CASE WHEN cardinality(why_choose) = 0 THEN ARRAY['High Weight Capacity', 'Patient Dignity Focus', 'Heavy-Duty Construction', 'Caregiver Safety Design']::text[] ELSE why_choose END,
  key_features = CASE WHEN cardinality(key_features) = 0 THEN ARRAY['High weight capacity (600-1000 lbs)', 'Extra-wide sleep surface', 'Reinforced frame', 'Heavy-duty motors', 'Specialized mattress compatibility']::text[] ELSE key_features END,
  benefits = CASE WHEN cardinality(benefits) = 0 THEN ARRAY['Patient dignity', 'Caregiver safety', 'Durability', 'Proper weight distribution']::text[] ELSE benefits END,
  ideal_for = CASE WHEN cardinality(ideal_for) = 0 THEN ARRAY['Bariatric care units', 'General hospitals', 'Long-term care', 'Home healthcare']::text[] ELSE ideal_for END
WHERE lower(slug) = 'bariatric-hospital-beds';

UPDATE public.categories SET
  intro_html = COALESCE(NULLIF(intro_html, ''), '<p>Pediatric hospital beds are thoughtfully designed to create a safe, comfortable, and child-friendly healing environment. These specialized beds feature enclosed sides, colorful aesthetics, and size-appropriate dimensions that help reduce anxiety and promote recovery in young patients.</p><p>Our pediatric beds include parent accommodation features and growth-adaptable sizing, recognizing that family involvement is crucial to a child''s healing journey while maintaining the highest safety standards.</p>'),
  why_choose = CASE WHEN cardinality(why_choose) = 0 THEN ARRAY['Child-Safe Design', 'Age-Appropriate Features', 'Parent-Friendly Access', 'Therapeutic Environment']::text[] ELSE why_choose END,
  key_features = CASE WHEN cardinality(key_features) = 0 THEN ARRAY['Child-safe design', 'Colorful aesthetics', 'Enclosed sides', 'Parent accommodation', 'Growth-adaptable sizing']::text[] ELSE key_features END,
  benefits = CASE WHEN cardinality(benefits) = 0 THEN ARRAY['Child-friendly environment', 'Parent peace of mind', 'Safety compliance', 'Therapeutic atmosphere']::text[] ELSE benefits END,
  ideal_for = CASE WHEN cardinality(ideal_for) = 0 THEN ARRAY['Pediatric hospitals', 'Children''s wards', 'Pediatric ICU', 'Specialty clinics']::text[] ELSE ideal_for END
WHERE lower(slug) = 'pediatric-hospital-beds';

UPDATE public.categories SET
  intro_html = COALESCE(NULLIF(intro_html, ''), '<p>Maternity and OB-GYN beds are specifically engineered for labor, delivery, and postpartum care. These versatile beds feature quick-positioning capabilities, stirrup attachments, and removable sections to accommodate all stages of childbirth and gynecological procedures.</p><p>Designed for both patient comfort and clinical efficiency, our maternity beds provide easy-cleaning surfaces and optimal positioning options that support natural birthing processes while enabling medical interventions when needed.</p>'),
  why_choose = CASE WHEN cardinality(why_choose) = 0 THEN ARRAY['Versatile Positioning', 'Quick Configuration', 'Easy Maintenance', 'Patient Comfort Focus']::text[] ELSE why_choose END,
  key_features = CASE WHEN cardinality(key_features) = 0 THEN ARRAY['Stirrup attachments', 'Quick positioning', 'Removable sections', 'Trendelenburg position', 'Easy cleaning surfaces']::text[] ELSE key_features END,
  benefits = CASE WHEN cardinality(benefits) = 0 THEN ARRAY['Versatile positioning', 'Patient comfort', 'Efficient delivery support', 'Infection control']::text[] ELSE benefits END,
  ideal_for = CASE WHEN cardinality(ideal_for) = 0 THEN ARRAY['Labor and delivery rooms', 'OB-GYN clinics', 'Birthing centers', 'Women''s health facilities']::text[] ELSE ideal_for END
WHERE lower(slug) = 'maternity-ob-gyn-beds';

UPDATE public.categories SET
  intro_html = COALESCE(NULLIF(intro_html, ''), '<p>Fowler beds are designed for patients who benefit from semi-upright positioning, particularly those with respiratory or cardiac conditions. Named after the Fowler''s position, these beds provide adjustable backrest angles that help improve breathing, reduce aspiration risk, and enhance overall patient comfort.</p><p>Our Fowler beds feature smooth adjustment mechanisms and cardiac chair positioning options, making them ideal for patients requiring extended periods of elevated upper body positioning during their care and recovery.</p>'),
  why_choose = CASE WHEN cardinality(why_choose) = 0 THEN ARRAY['Respiratory Support', 'Smooth Adjustments', 'Cardiac Chair Mode', 'Enhanced Recovery']::text[] ELSE why_choose END,
  key_features = CASE WHEN cardinality(key_features) = 0 THEN ARRAY['Semi-upright positioning', 'Adjustable backrest angles', 'Knee gatch function', 'Cardiac chair position', 'Easy operation']::text[] ELSE key_features END,
  benefits = CASE WHEN cardinality(benefits) = 0 THEN ARRAY['Respiratory support', 'Patient comfort', 'Reduced aspiration risk', 'Post-operative care']::text[] ELSE benefits END,
  ideal_for = CASE WHEN cardinality(ideal_for) = 0 THEN ARRAY['Cardiac care', 'Respiratory therapy', 'Post-surgical recovery', 'General medical care']::text[] ELSE ideal_for END
WHERE lower(slug) = 'fowler-beds';

UPDATE public.categories SET
  intro_html = COALESCE(NULLIF(intro_html, ''), '<p>Orthopedic hospital beds are specialized for patients recovering from bone fractures, joint replacements, and other musculoskeletal conditions. These beds feature traction frame compatibility, overhead trapeze bars, and firm mattress platforms that support proper skeletal alignment during healing.</p><p>Our orthopedic beds are designed with split frame options and weight-bearing support features that facilitate physical therapy exercises and help patients regain mobility while ensuring proper positioning for optimal recovery.</p>'),
  why_choose = CASE WHEN cardinality(why_choose) = 0 THEN ARRAY['Traction Compatible', 'Mobility Support', 'Alignment Features', 'Recovery Focused']::text[] ELSE why_choose END,
  key_features = CASE WHEN cardinality(key_features) = 0 THEN ARRAY['Traction frame compatibility', 'Overhead trapeze bar', 'Firm mattress platform', 'Split frame design', 'Weight-bearing support']::text[] ELSE key_features END,
  benefits = CASE WHEN cardinality(benefits) = 0 THEN ARRAY['Proper alignment', 'Mobility assistance', 'Healing support', 'Patient independence']::text[] ELSE benefits END,
  ideal_for = CASE WHEN cardinality(ideal_for) = 0 THEN ARRAY['Orthopedic surgery recovery', 'Fracture care', 'Joint replacement recovery', 'Physical therapy']::text[] ELSE ideal_for END
WHERE lower(slug) = 'orthopedic-hospital-beds';

UPDATE public.categories SET
  intro_html = COALESCE(NULLIF(intro_html, ''), '<p>Adjustable hospital beds offer the ultimate in personalized patient comfort with multiple position presets, memory settings, and modern amenities. These beds cater to facilities focused on enhancing patient experience without compromising on clinical functionality.</p><p>Featuring options like massage functions, USB charging ports, and under-bed lighting, our adjustable beds are perfect for private rooms, VIP suites, and long-term care settings where patient comfort significantly impacts recovery outcomes.</p>'),
  why_choose = CASE WHEN cardinality(why_choose) = 0 THEN ARRAY['Personalized Comfort', 'Memory Positions', 'Modern Amenities', 'Premium Experience']::text[] ELSE why_choose END,
  key_features = CASE WHEN cardinality(key_features) = 0 THEN ARRAY['Multiple position presets', 'Memory settings', 'Massage function options', 'USB charging ports', 'Under-bed lighting']::text[] ELSE key_features END,
  benefits = CASE WHEN cardinality(benefits) = 0 THEN ARRAY['Personalized comfort', 'Enhanced patient experience', 'Modern amenities', 'Flexibility']::text[] ELSE benefits END,
  ideal_for = CASE WHEN cardinality(ideal_for) = 0 THEN ARRAY['Private rooms', 'VIP suites', 'Long-term stays', 'Rehabilitation']::text[] ELSE ideal_for END
WHERE lower(slug) = 'adjustable-hospital-beds';

UPDATE public.categories SET
  intro_html = COALESCE(NULLIF(intro_html, ''), '<p>Air therapy beds utilize advanced air technology to provide pressure relief and wound healing support for patients at risk of or recovering from pressure ulcers. These specialized beds feature alternating pressure systems and low air loss technology that maintain optimal skin microclimate.</p><p>Our air therapy beds offer zone control and automatic adjustment capabilities, reducing the need for manual patient turning while providing superior pressure redistribution essential for wound care and burn recovery patients.</p>'),
  why_choose = CASE WHEN cardinality(why_choose) = 0 THEN ARRAY['Pressure Prevention', 'Automatic Adjustment', 'Zone Control', 'Wound Healing Support']::text[] ELSE why_choose END,
  key_features = CASE WHEN cardinality(key_features) = 0 THEN ARRAY['Alternating pressure system', 'Low air loss technology', 'Microclimate management', 'Zone control', 'Automatic adjustment']::text[] ELSE key_features END,
  benefits = CASE WHEN cardinality(benefits) = 0 THEN ARRAY['Pressure ulcer prevention', 'Wound healing support', 'Patient comfort', 'Reduced turning needs']::text[] ELSE benefits END,
  ideal_for = CASE WHEN cardinality(ideal_for) = 0 THEN ARRAY['Wound care units', 'Burn care', 'Long-term care', 'ICU settings']::text[] ELSE ideal_for END
WHERE lower(slug) = 'air-therapy-beds';

UPDATE public.categories SET
  intro_html = COALESCE(NULLIF(intro_html, ''), '<p>Specialty therapy beds are designed for patients with specific medical conditions requiring targeted therapeutic interventions. These advanced beds offer specialized therapy modes including pulmonary support, percussion therapy, and rotation therapy to address complex care needs.</p><p>Our specialty beds feature customizable configurations that can be tailored to individual patient requirements, supporting improved outcomes for patients with neurological conditions, spinal cord injuries, and critical respiratory needs.</p>'),
  why_choose = CASE WHEN cardinality(why_choose) = 0 THEN ARRAY['Targeted Therapy', 'Multiple Therapy Modes', 'Custom Configuration', 'Improved Outcomes']::text[] ELSE why_choose END,
  key_features = CASE WHEN cardinality(key_features) = 0 THEN ARRAY['Specialized therapy modes', 'Pulmonary support', 'Percussion therapy', 'Rotation therapy', 'Custom configurations']::text[] ELSE key_features END,
  benefits = CASE WHEN cardinality(benefits) = 0 THEN ARRAY['Targeted treatment', 'Improved outcomes', 'Reduced complications', 'Specialized care']::text[] ELSE benefits END,
  ideal_for = CASE WHEN cardinality(ideal_for) = 0 THEN ARRAY['Pulmonary care', 'Neurological units', 'Spinal cord injury', 'Critical care']::text[] ELSE ideal_for END
WHERE lower(slug) = 'specialty-therapy-beds';

UPDATE public.categories SET
  intro_html = COALESCE(NULLIF(intro_html, ''), '<p>Examination beds are essential equipment for medical offices, clinics, and outpatient facilities where patient examinations and minor procedures are performed. These beds feature easy-cleaning surfaces, height adjustment, and practical storage solutions for examination accessories.</p><p>Our examination beds are built for durability and hygiene, with paper roll holders, step stool storage, and sturdy construction that supports the high-volume patient flow typical of busy medical practices.</p>'),
  why_choose = CASE WHEN cardinality(why_choose) = 0 THEN ARRAY['Hygienic Design', 'Quick Patient Turnover', 'Practical Storage', 'Durable Construction']::text[] ELSE why_choose END,
  key_features = CASE WHEN cardinality(key_features) = 0 THEN ARRAY['Paper roll holder', 'Step stool storage', 'Easy cleaning surface', 'Height adjustment', 'Sturdy construction']::text[] ELSE key_features END,
  benefits = CASE WHEN cardinality(benefits) = 0 THEN ARRAY['Efficient examinations', 'Patient accessibility', 'Hygienic design', 'Versatile use']::text[] ELSE benefits END,
  ideal_for = CASE WHEN cardinality(ideal_for) = 0 THEN ARRAY['Doctor offices', 'Outpatient clinics', 'Urgent care', 'Physical therapy']::text[] ELSE ideal_for END
WHERE lower(slug) = 'examination-beds';

UPDATE public.categories SET
  intro_html = COALESCE(NULLIF(intro_html, ''), '<p>Recovery beds are designed for post-operative and post-anesthesia care units where patient monitoring and quick access are essential. These beds feature easy-to-reach controls, drainage bag hooks, and IV pole mounts that support the immediate needs of recovering patients.</p><p>Our recovery beds prioritize caregiver accessibility and patient safety, with side rail controls and quick positioning features that enable efficient care delivery during the critical post-procedure recovery period.</p>'),
  why_choose = CASE WHEN cardinality(why_choose) = 0 THEN ARRAY['Post-Op Optimized', 'Quick Access Design', 'Monitoring Support', 'Patient Safety Focus']::text[] ELSE why_choose END,
  key_features = CASE WHEN cardinality(key_features) = 0 THEN ARRAY['Easy patient monitoring', 'Quick positioning', 'Side rail controls', 'Drainage bag hooks', 'IV pole mounts']::text[] ELSE key_features END,
  benefits = CASE WHEN cardinality(benefits) = 0 THEN ARRAY['Safe recovery environment', 'Caregiver accessibility', 'Patient comfort', 'Efficient care']::text[] ELSE benefits END,
  ideal_for = CASE WHEN cardinality(ideal_for) = 0 THEN ARRAY['Post-anesthesia care', 'Same-day surgery', 'Recovery rooms', 'Observation units']::text[] ELSE ideal_for END
WHERE lower(slug) = 'recovery-beds';

UPDATE public.categories SET
  intro_html = COALESCE(NULLIF(intro_html, ''), '<p>Stretchers and trolleys are essential for safe and efficient patient transport throughout healthcare facilities. Our bed-type stretchers combine the functionality of a patient transport system with the comfort features of a hospital bed.</p><p>Designed for emergency readiness and easy maneuverability, these stretchers feature radiolucent tops for imaging, quick-release rails, and compact storage capabilities that make them indispensable in emergency departments and operating rooms.</p>'),
  why_choose = CASE WHEN cardinality(why_choose) = 0 THEN ARRAY['Easy Maneuverability', 'Emergency Ready', 'Radiolucent Design', 'Versatile Transport']::text[] ELSE why_choose END,
  key_features = CASE WHEN cardinality(key_features) = 0 THEN ARRAY['Easy maneuverability', 'Emergency features', 'Compact storage', 'Quick-release rails', 'Radiolucent top']::text[] ELSE key_features END,
  benefits = CASE WHEN cardinality(benefits) = 0 THEN ARRAY['Rapid patient transport', 'Emergency readiness', 'Space efficiency', 'Versatile use']::text[] ELSE benefits END,
  ideal_for = CASE WHEN cardinality(ideal_for) = 0 THEN ARRAY['Emergency departments', 'Operating rooms', 'Radiology', 'Patient transport']::text[] ELSE ideal_for END
WHERE lower(slug) = 'stretchers-trolleys';

UPDATE public.categories SET
  intro_html = COALESCE(NULLIF(intro_html, ''), '<p>Homecare hospital beds bring hospital-quality care into the home environment without sacrificing comfort or aesthetics. These beds feature home-friendly designs with wood grain finishes, quiet operation, and compact footprints that blend seamlessly with residential settings.</p><p>Our homecare beds are designed for easy assembly and operation by family caregivers, supporting patients who prefer to receive care at home while maintaining the clinical functionality needed for effective treatment and recovery.</p>'),
  why_choose = CASE WHEN cardinality(why_choose) = 0 THEN ARRAY['Home-Friendly Design', 'Easy Setup', 'Quiet Operation', 'Caregiver Support']::text[] ELSE why_choose END,
  key_features = CASE WHEN cardinality(key_features) = 0 THEN ARRAY['Home-friendly design', 'Quiet operation', 'Wood grain aesthetics', 'Compact footprint', 'Easy assembly']::text[] ELSE key_features END,
  benefits = CASE WHEN cardinality(benefits) = 0 THEN ARRAY['Home comfort', 'Independence', 'Caregiver support', 'Quality of life']::text[] ELSE benefits END,
  ideal_for = CASE WHEN cardinality(ideal_for) = 0 THEN ARRAY['Home healthcare', 'Hospice care', 'Chronic illness management', 'Aging in place']::text[] ELSE ideal_for END
WHERE lower(slug) = 'homecare-hospital-beds';

UPDATE public.categories SET
  intro_html = COALESCE(NULLIF(intro_html, ''), '<p>Isolation beds are specifically designed for patients with infectious diseases or those requiring protective isolation. These beds feature sealed surfaces, easy decontamination properties, and compatibility with negative pressure room systems.</p><p>Our isolation beds incorporate infection control best practices with disposable components and materials that can withstand rigorous cleaning protocols, protecting both patients and healthcare workers in high-risk situations.</p>'),
  why_choose = CASE WHEN cardinality(why_choose) = 0 THEN ARRAY['Infection Prevention', 'Quick Decontamination', 'Sealed Surfaces', 'Staff Protection']::text[] ELSE why_choose END,
  key_features = CASE WHEN cardinality(key_features) = 0 THEN ARRAY['Negative pressure compatibility', 'Easy decontamination', 'Sealed surfaces', 'Disposable components', 'Infection control features']::text[] ELSE key_features END,
  benefits = CASE WHEN cardinality(benefits) = 0 THEN ARRAY['Infection prevention', 'Staff protection', 'Patient isolation', 'Regulatory compliance']::text[] ELSE benefits END,
  ideal_for = CASE WHEN cardinality(ideal_for) = 0 THEN ARRAY['Infectious disease units', 'Quarantine rooms', 'Immunocompromised patients', 'Pandemic response']::text[] ELSE ideal_for END
WHERE lower(slug) = 'isolation-beds';

UPDATE public.categories SET
  intro_html = COALESCE(NULLIF(intro_html, ''), '<p>Psychiatric beds are engineered with patient safety as the paramount concern, featuring tamper-resistant designs, no ligature points, and weighted construction to prevent tipping or misuse. These beds create a safe therapeutic environment for mental health patients.</p><p>Our psychiatric beds balance safety requirements with patient dignity, featuring soft edges and integrated safety features that reduce self-harm risks while maintaining a non-institutional appearance that supports the healing process.</p>'),
  why_choose = CASE WHEN cardinality(why_choose) = 0 THEN ARRAY['Ligature-Free Design', 'Rapid Assessment Access', 'Tamper Resistant', 'Patient Safety First']::text[] ELSE why_choose END,
  key_features = CASE WHEN cardinality(key_features) = 0 THEN ARRAY['Tamper-resistant design', 'No ligature points', 'Soft edges', 'Weighted construction', 'Integrated safety features']::text[] ELSE key_features END,
  benefits = CASE WHEN cardinality(benefits) = 0 THEN ARRAY['Patient safety', 'Self-harm prevention', 'Durable construction', 'Therapeutic environment']::text[] ELSE benefits END,
  ideal_for = CASE WHEN cardinality(ideal_for) = 0 THEN ARRAY['Psychiatric hospitals', 'Mental health units', 'Crisis stabilization', 'Behavioral health']::text[] ELSE ideal_for END
WHERE lower(slug) = 'psychiatric-beds';

UPDATE public.categories SET
  intro_html = COALESCE(NULLIF(intro_html, ''), '<p>Convertible chair beds offer multi-functional versatility, transforming from traditional bed positions to full chair configurations. These innovative beds are ideal for patients who benefit from extended periods of sitting, such as those undergoing dialysis or cardiac care.</p><p>Our convertible beds feature smooth transitions between positions, cardiac chair mode, and space-efficient designs that maximize room utility while providing comfortable seating options that support patient mobility and respiratory function.</p>'),
  why_choose = CASE WHEN cardinality(why_choose) = 0 THEN ARRAY['Multi-Functional Design', 'Smooth Transitions', 'Space Efficient', 'Patient Mobility']::text[] ELSE why_choose END,
  key_features = CASE WHEN cardinality(key_features) = 0 THEN ARRAY['Chair position capability', 'Cardiac chair mode', 'Easy transitions', 'Reclining options', 'Compact design']::text[] ELSE key_features END,
  benefits = CASE WHEN cardinality(benefits) = 0 THEN ARRAY['Versatility', 'Patient mobility', 'Space efficiency', 'Respiratory support']::text[] ELSE benefits END,
  ideal_for = CASE WHEN cardinality(ideal_for) = 0 THEN ARRAY['Dialysis centers', 'Outpatient procedures', 'Cardiac care', 'Rehabilitation']::text[] ELSE ideal_for END
WHERE lower(slug) = 'convertible-chair-beds';

UPDATE public.categories SET
  intro_html = COALESCE(NULLIF(intro_html, ''), '<p>Fully electric hospital beds represent the pinnacle of patient care technology, offering complete motorized control over all bed positions.</p><p>With the touch of a button, caregivers and patients can adjust height, head, foot, and Trendelenburg positions.</p>'),
  why_choose = CASE WHEN cardinality(why_choose) = 0 THEN ARRAY['Maximum Convenience', 'Quick Position Changes', 'Advanced Safety Features', 'Premium Construction']::text[] ELSE why_choose END,
  key_features = CASE WHEN cardinality(key_features) = 0 THEN ARRAY['Full electric controls', 'Programmable positions', 'Trendelenburg capability', 'Low height function']::text[] ELSE key_features END,
  benefits = CASE WHEN cardinality(benefits) = 0 THEN ARRAY['Maximum convenience', 'Reduced injury risk', 'Patient independence']::text[] ELSE benefits END,
  ideal_for = CASE WHEN cardinality(ideal_for) = 0 THEN ARRAY['Acute care hospitals', 'ICU settings', 'Post-surgical care']::text[] ELSE ideal_for END
WHERE lower(slug) = 'fully-electric-bed';

UPDATE public.categories SET
  intro_html = COALESCE(NULLIF(intro_html, ''), '<p>Semi-electric hospital beds combine the convenience of electric controls with manual reliability.</p><p>Perfect for facilities seeking to upgrade from fully manual beds with balanced functionality and cost.</p>'),
  why_choose = CASE WHEN cardinality(why_choose) = 0 THEN ARRAY['Balanced Cost & Features', 'Patient-Controlled Comfort', 'Reduced Caregiver Strain', 'Energy Efficient Design']::text[] ELSE why_choose END,
  key_features = CASE WHEN cardinality(key_features) = 0 THEN ARRAY['Electric head and foot controls', 'Manual crank height adjustment', 'Pendant controller']::text[] ELSE key_features END,
  benefits = CASE WHEN cardinality(benefits) = 0 THEN ARRAY['Balance of cost and convenience', 'Patient-controlled positioning']::text[] ELSE benefits END,
  ideal_for = CASE WHEN cardinality(ideal_for) = 0 THEN ARRAY['Nursing homes', 'Rehabilitation centers', 'Home healthcare']::text[] ELSE ideal_for END
WHERE lower(slug) = 'semi-electric-bed';

UPDATE public.categories SET
  intro_html = COALESCE(NULLIF(intro_html, ''), '<p>Bariatric hospital beds are engineered to safely accommodate larger patients with weight capacities ranging from 600 to 1000+ pounds.</p><p>These heavy-duty beds feature reinforced frames and specialized motors designed for extended durability.</p>'),
  why_choose = CASE WHEN cardinality(why_choose) = 0 THEN ARRAY['High Weight Capacity', 'Patient Dignity Focus', 'Heavy-Duty Construction', 'Caregiver Safety Design']::text[] ELSE why_choose END,
  key_features = CASE WHEN cardinality(key_features) = 0 THEN ARRAY['High weight capacity (600-1000 lbs)', 'Extra-wide sleep surface', 'Reinforced frame']::text[] ELSE key_features END,
  benefits = CASE WHEN cardinality(benefits) = 0 THEN ARRAY['Patient dignity', 'Caregiver safety', 'Durability']::text[] ELSE benefits END,
  ideal_for = CASE WHEN cardinality(ideal_for) = 0 THEN ARRAY['Bariatric care units', 'General hospitals', 'Long-term care']::text[] ELSE ideal_for END
WHERE lower(slug) = 'bariatric-bed';

UPDATE public.categories SET
  intro_html = COALESCE(NULLIF(intro_html, ''), '<p>Specialized burn care beds designed for patients with severe burns requiring specialized therapeutic surfaces.</p><p>Features advanced air therapy and pressure relief technology for optimal wound healing.</p>'),
  why_choose = CASE WHEN cardinality(why_choose) = 0 THEN ARRAY['Burn Care Specialized', 'Rapid Healing Support', 'Air Therapy Technology', 'Clinical Excellence']::text[] ELSE why_choose END,
  key_features = CASE WHEN cardinality(key_features) = 0 THEN ARRAY['Air therapy surface', 'Temperature control', 'Low friction design', 'Easy patient access']::text[] ELSE key_features END,
  benefits = CASE WHEN cardinality(benefits) = 0 THEN ARRAY['Optimal wound healing', 'Reduced pressure points', 'Temperature regulation']::text[] ELSE benefits END,
  ideal_for = CASE WHEN cardinality(ideal_for) = 0 THEN ARRAY['Burn units', 'Trauma centers', 'Wound care facilities']::text[] ELSE ideal_for END
WHERE lower(slug) = 'burn-bed';

UPDATE public.categories SET
  intro_html = COALESCE(NULLIF(intro_html, ''), '<p>Professional EMS stretchers designed for emergency medical services and ambulance transport.</p>'),
  why_choose = CASE WHEN cardinality(why_choose) = 0 THEN ARRAY['Emergency Ready', 'Quick Deploy', 'Lightweight', 'Durable']::text[] ELSE why_choose END,
  key_features = CASE WHEN cardinality(key_features) = 0 THEN ARRAY['Lightweight aluminum', 'Quick-fold mechanism', 'Ambulance compatible']::text[] ELSE key_features END,
  benefits = CASE WHEN cardinality(benefits) = 0 THEN ARRAY['Rapid deployment', 'Easy handling', 'Patient safety']::text[] ELSE benefits END,
  ideal_for = CASE WHEN cardinality(ideal_for) = 0 THEN ARRAY['Ambulances', 'Emergency response', 'Field operations']::text[] ELSE ideal_for END
WHERE lower(slug) = 'ems-stretcher';

UPDATE public.categories SET
  intro_html = COALESCE(NULLIF(intro_html, ''), '<p>Emergency room stretchers built for high-volume hospital emergency departments.</p>'),
  why_choose = CASE WHEN cardinality(why_choose) = 0 THEN ARRAY['ER Optimized', 'Quick Access', 'Easy Clean', 'Durable']::text[] ELSE why_choose END,
  key_features = CASE WHEN cardinality(key_features) = 0 THEN ARRAY['IV pole mounts', 'O2 tank holder', 'Side rail controls']::text[] ELSE key_features END,
  benefits = CASE WHEN cardinality(benefits) = 0 THEN ARRAY['Fast patient care', 'Multi-functional', 'Easy maintenance']::text[] ELSE benefits END,
  ideal_for = CASE WHEN cardinality(ideal_for) = 0 THEN ARRAY['Emergency departments', 'Urgent care', 'Trauma centers']::text[] ELSE ideal_for END
WHERE lower(slug) = 'er-stretcher';

UPDATE public.categories SET
  intro_html = COALESCE(NULLIF(intro_html, ''), '<p>Surgical stretchers designed for operating room patient transport and pre/post-op care.</p>'),
  why_choose = CASE WHEN cardinality(why_choose) = 0 THEN ARRAY['Surgical Grade', 'OR Compatible', 'Sterile Design', 'Precision']::text[] ELSE why_choose END,
  key_features = CASE WHEN cardinality(key_features) = 0 THEN ARRAY['X-ray translucent', 'Easy transfer', 'Sterile surfaces']::text[] ELSE key_features END,
  benefits = CASE WHEN cardinality(benefits) = 0 THEN ARRAY['OR compatibility', 'Safe transfers', 'Infection control']::text[] ELSE benefits END,
  ideal_for = CASE WHEN cardinality(ideal_for) = 0 THEN ARRAY['Operating rooms', 'Pre-op', 'Post-op recovery']::text[] ELSE ideal_for END
WHERE lower(slug) = 'surgery-stretcher';

UPDATE public.categories SET
  intro_html = COALESCE(NULLIF(intro_html, ''), '<p>Heavy-duty stretchers for larger patients with high weight capacity and reinforced construction.</p>'),
  why_choose = CASE WHEN cardinality(why_choose) = 0 THEN ARRAY['High Capacity', 'Safe Handling', 'Reinforced', 'Dignified Care']::text[] ELSE why_choose END,
  key_features = CASE WHEN cardinality(key_features) = 0 THEN ARRAY['1000+ lb capacity', 'Extra-wide platform', 'Heavy-duty wheels']::text[] ELSE key_features END,
  benefits = CASE WHEN cardinality(benefits) = 0 THEN ARRAY['Patient safety', 'Caregiver safety', 'Durability']::text[] ELSE benefits END,
  ideal_for = CASE WHEN cardinality(ideal_for) = 0 THEN ARRAY['Bariatric care', 'Emergency transport', 'Hospital transfers']::text[] ELSE ideal_for END
WHERE lower(slug) = 'bariatric-stretcher';

UPDATE public.categories SET
  intro_html = COALESCE(NULLIF(intro_html, ''), '<p>Emergency evacuation stretchers for rapid patient evacuation during emergencies.</p>'),
  why_choose = CASE WHEN cardinality(why_choose) = 0 THEN ARRAY['Rapid Evac', 'Quick Deploy', 'Compact Storage', 'Safety Certified']::text[] ELSE why_choose END,
  key_features = CASE WHEN cardinality(key_features) = 0 THEN ARRAY['Compact fold', 'Stair-capable', 'Multiple handles']::text[] ELSE key_features END,
  benefits = CASE WHEN cardinality(benefits) = 0 THEN ARRAY['Emergency ready', 'Easy storage', 'Versatile use']::text[] ELSE benefits END,
  ideal_for = CASE WHEN cardinality(ideal_for) = 0 THEN ARRAY['Emergency evacuation', 'Disaster response', 'Building safety']::text[] ELSE ideal_for END
WHERE lower(slug) = 'evac-stretcher';

UPDATE public.categories SET
  intro_html = COALESCE(NULLIF(intro_html, ''), '<p>Hospital bedside tables for patient convenience and comfort during their stay.</p>'),
  why_choose = CASE WHEN cardinality(why_choose) = 0 THEN ARRAY['Patient Comfort', 'Easy Access', 'Adjustable', 'Durable']::text[] ELSE why_choose END,
  key_features = CASE WHEN cardinality(key_features) = 0 THEN ARRAY['Height adjustable', 'Tilt top', 'Lockable wheels']::text[] ELSE key_features END,
  benefits = CASE WHEN cardinality(benefits) = 0 THEN ARRAY['Patient independence', 'Easy meals', 'Organized space']::text[] ELSE benefits END,
  ideal_for = CASE WHEN cardinality(ideal_for) = 0 THEN ARRAY['Patient rooms', 'Long-term care', 'Home healthcare']::text[] ELSE ideal_for END
WHERE lower(slug) = 'bedside-table';

UPDATE public.categories SET
  intro_html = COALESCE(NULLIF(intro_html, ''), '<p>Overbed tables that position over the bed for eating, reading, and activities.</p>'),
  why_choose = CASE WHEN cardinality(why_choose) = 0 THEN ARRAY['Versatile Use', 'Easy Adjust', 'Stable Design', 'Quality Built']::text[] ELSE why_choose END,
  key_features = CASE WHEN cardinality(key_features) = 0 THEN ARRAY['Height adjustable', 'Tilting surface', 'Easy clean top']::text[] ELSE key_features END,
  benefits = CASE WHEN cardinality(benefits) = 0 THEN ARRAY['Meal support', 'Activity surface', 'Patient comfort']::text[] ELSE benefits END,
  ideal_for = CASE WHEN cardinality(ideal_for) = 0 THEN ARRAY['Hospitals', 'Nursing homes', 'Home care']::text[] ELSE ideal_for END
WHERE lower(slug) = 'bed-over-table';

UPDATE public.categories SET
  intro_html = COALESCE(NULLIF(intro_html, ''), '<p>Medical wheelchairs for patient mobility and transport within healthcare facilities.</p>'),
  why_choose = CASE WHEN cardinality(why_choose) = 0 THEN ARRAY['Mobility Support', 'Easy Transport', 'Comfortable', 'Durable']::text[] ELSE why_choose END,
  key_features = CASE WHEN cardinality(key_features) = 0 THEN ARRAY['Foldable frame', 'Padded armrests', 'Footrests included']::text[] ELSE key_features END,
  benefits = CASE WHEN cardinality(benefits) = 0 THEN ARRAY['Patient mobility', 'Easy storage', 'Comfortable transport']::text[] ELSE benefits END,
  ideal_for = CASE WHEN cardinality(ideal_for) = 0 THEN ARRAY['Hospitals', 'Clinics', 'Home care', 'Rehabilitation']::text[] ELSE ideal_for END
WHERE lower(slug) = 'wheelchair';

UPDATE public.categories SET
  intro_html = COALESCE(NULLIF(intro_html, ''), '<p>Medical recliners for patient comfort during treatments, recovery, and extended stays.</p>'),
  why_choose = CASE WHEN cardinality(why_choose) = 0 THEN ARRAY['Comfort Focused', 'Multiple Positions', 'Easy Clean', 'Durable Fabric']::text[] ELSE why_choose END,
  key_features = CASE WHEN cardinality(key_features) = 0 THEN ARRAY['Multiple recline positions', 'Padded comfort', 'Easy-clean vinyl']::text[] ELSE key_features END,
  benefits = CASE WHEN cardinality(benefits) = 0 THEN ARRAY['Patient comfort', 'Treatment support', 'Versatile use']::text[] ELSE benefits END,
  ideal_for = CASE WHEN cardinality(ideal_for) = 0 THEN ARRAY['Infusion centers', 'Dialysis', 'Recovery rooms', 'Patient rooms']::text[] ELSE ideal_for END
WHERE lower(slug) = 'patient-recliner';

