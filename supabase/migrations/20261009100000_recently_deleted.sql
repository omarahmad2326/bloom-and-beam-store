-- Recently Deleted: anything deleted from the dashboard can be restored for 7 days.
--
-- An AFTER DELETE trigger on each content table copies the deleted row into
-- public.deleted_items. Admins restore it (same id, so old links and orders keep
-- working) or delete it for good. Rows older than 7 days are purged automatically
-- (on every delete and every time the Recently Deleted screen loads).
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS public.deleted_items (
  id bigserial PRIMARY KEY,
  -- Rows deleted in the same transaction (e.g. a home card and its menu items) share a batch.
  batch_id bigint NOT NULL DEFAULT txid_current(),
  table_name text NOT NULL,
  row_id text NOT NULL,
  label text,
  data jsonb NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  deleted_by uuid,
  deleted_by_email text
);
CREATE INDEX IF NOT EXISTS deleted_items_deleted_at_idx ON public.deleted_items (deleted_at DESC);
CREATE INDEX IF NOT EXISTS deleted_items_batch_idx ON public.deleted_items (batch_id);

ALTER TABLE public.deleted_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view deleted items" ON public.deleted_items;
CREATE POLICY "Admins can view deleted items" ON public.deleted_items
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));
-- No insert/update/delete policies: only the trigger and the functions below write here.

CREATE OR REPLACE FUNCTION public.capture_deleted_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  j jsonb := to_jsonb(OLD);
  who uuid := auth.uid();
BEGIN
  -- Redirects removed by other triggers (a slug coming back into use) are housekeeping, not deletions.
  IF TG_TABLE_NAME = 'redirects' AND pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;

  DELETE FROM public.deleted_items WHERE deleted_at < now() - interval '7 days';

  INSERT INTO public.deleted_items (table_name, row_id, label, data, deleted_by, deleted_by_email)
  VALUES (
    TG_TABLE_NAME,
    j ->> 'id',
    left(coalesce(
      nullif(j ->> 'name', ''),
      nullif(j ->> 'title', ''),
      nullif(j ->> 'question', ''),
      CASE WHEN j ? 'from_path' THEN (j ->> 'from_path') || ' → ' || (j ->> 'to_path') END,
      CASE WHEN j ? 'customer_name' THEN 'Order from ' || (j ->> 'customer_name') END,
      CASE WHEN j ? 'subject' THEN (j ->> 'subject') || coalesce(' (' || nullif(j ->> 'email', '') || ')', '') END,
      nullif(j ->> 'email', ''),
      j ->> 'id'
    ), 200),
    j,
    who,
    (SELECT email FROM auth.users WHERE id = who)
  );
  RETURN OLD;
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'products', 'parts', 'services', 'categories', 'blog_posts', 'faqs', 'site_pages',
    'home_service_cards', 'home_service_card_items', 'redirects', 'orders', 'contact_messages'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS capture_deleted_row ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER capture_deleted_row AFTER DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.capture_deleted_row()', t);
  END LOOP;
END $$;

-- Items for the Recently Deleted screen (newest first). Menu items deleted together with their
-- home card are restored with the card, so they are not listed separately.
CREATE OR REPLACE FUNCTION public.list_deleted_items()
RETURNS SETOF public.deleted_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin privileges required' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.deleted_items WHERE deleted_at < now() - interval '7 days';
  RETURN QUERY
    SELECT d.* FROM public.deleted_items d
    WHERE NOT (
      d.table_name = 'home_service_card_items' AND EXISTS (
        SELECT 1 FROM public.deleted_items c
        WHERE c.batch_id = d.batch_id AND c.table_name = 'home_service_cards' AND c.row_id = d.data ->> 'card_id'
      )
    )
    ORDER BY d.deleted_at DESC, d.id DESC;
END;
$$;

-- Put one deleted row back (columns that no longer exist are ignored; new columns get their defaults).
CREATE OR REPLACE FUNCTION public.reinsert_deleted_row(p_table text, p_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cols text;
BEGIN
  SELECT string_agg(quote_ident(c.column_name), ', ' ORDER BY c.ordinal_position)
  INTO cols
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = p_table AND p_data ? c.column_name
    AND c.is_generated = 'NEVER';

  EXECUTE format(
    'INSERT INTO public.%1$I (%2$s) SELECT %2$s FROM jsonb_populate_record(NULL::public.%1$I, $1)',
    p_table, cols
  ) USING p_data;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_deleted_item(p_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item public.deleted_items;
  child public.deleted_items;
  payload jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin privileges required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO item FROM public.deleted_items WHERE id = p_id;
  IF NOT FOUND OR item.deleted_at < now() - interval '7 days' THEN
    RAISE EXCEPTION 'This item is no longer in Recently Deleted (items are kept for 7 days).' USING ERRCODE = 'P0002';
  END IF;

  payload := item.data;
  -- A product whose category was deleted since comes back without a category.
  IF item.table_name = 'products' AND payload ->> 'category_id' IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.categories WHERE id = (payload ->> 'category_id')::uuid) THEN
    payload := jsonb_set(payload, '{category_id}', 'null'::jsonb);
  END IF;

  BEGIN
    PERFORM public.reinsert_deleted_row(item.table_name, payload);
    DELETE FROM public.deleted_items WHERE id = item.id;

    -- Menu items deleted with their home card come back with it.
    IF item.table_name = 'home_service_cards' THEN
      FOR child IN
        SELECT * FROM public.deleted_items
        WHERE batch_id = item.batch_id AND table_name = 'home_service_card_items' AND data ->> 'card_id' = item.row_id
        ORDER BY id
      LOOP
        PERFORM public.reinsert_deleted_row(child.table_name, child.data);
        DELETE FROM public.deleted_items WHERE id = child.id;
      END LOOP;
    END IF;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'Cannot restore "%": another item already uses the same URL/slug or name. Rename or delete that one first.', item.label
        USING ERRCODE = '23505';
    WHEN foreign_key_violation THEN
      RAISE EXCEPTION 'Cannot restore "%": something it belongs to was deleted. Restore that first.', item.label
        USING ERRCODE = '23503';
  END;

  RETURN jsonb_build_object('table_name', item.table_name, 'row_id', item.row_id, 'label', item.label);
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_deleted_item(p_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item public.deleted_items;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin privileges required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO item FROM public.deleted_items WHERE id = p_id;
  IF NOT FOUND THEN RETURN; END IF;
  DELETE FROM public.deleted_items
  WHERE id = item.id
     OR (item.table_name = 'home_service_cards' AND batch_id = item.batch_id
         AND table_name = 'home_service_card_items' AND data ->> 'card_id' = item.row_id);
END;
$$;

REVOKE ALL ON FUNCTION public.reinsert_deleted_row(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.capture_deleted_row() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_deleted_items() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_deleted_item(bigint) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.purge_deleted_item(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_deleted_items() TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_deleted_item(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purge_deleted_item(bigint) TO authenticated;
