-- Newsletter: subscribers (footer sign-up form), campaigns written in the dashboard and sent with
-- Resend from the website server (src/app/api/newsletter). Safe to re-run.

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 254),
  status text NOT NULL DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed')),
  -- Secret in each email's unsubscribe link.
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_email_key ON public.newsletter_subscribers (lower(email));

CREATE TABLE IF NOT EXISTS public.newsletter_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL DEFAULT '',
  preheader text,
  content_html text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent', 'failed')),
  recipient_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  last_error text,
  sent_at timestamptz,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS update_newsletter_subscribers_updated_at ON public.newsletter_subscribers;
CREATE TRIGGER update_newsletter_subscribers_updated_at BEFORE UPDATE ON public.newsletter_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_newsletter_campaigns_updated_at ON public.newsletter_campaigns;
CREATE TRIGGER update_newsletter_campaigns_updated_at BEFORE UPDATE ON public.newsletter_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admins can manage subscribers" ON public.newsletter_subscribers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins can manage campaigns" ON public.newsletter_campaigns;
CREATE POLICY "Admins can manage campaigns" ON public.newsletter_campaigns FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
-- Visitors never read these tables; they sign up / unsubscribe through the functions below.

-- Sign-up from the website. Returns the unsubscribe token only when the address was not already
-- subscribed (new or coming back), so the welcome email goes out once and an existing
-- subscriber's token is never revealed.
CREATE OR REPLACE FUNCTION public.newsletter_subscribe(p_email text, p_source text DEFAULT 'footer')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  addr text := lower(trim(p_email));
  sub public.newsletter_subscribers;
BEGIN
  IF addr IS NULL OR addr !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(addr) > 254 THEN
    RAISE EXCEPTION 'Please enter a valid email address.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO sub FROM public.newsletter_subscribers WHERE lower(email) = addr;
  IF FOUND AND sub.status = 'subscribed' THEN
    RETURN jsonb_build_object('status', 'already_subscribed');
  ELSIF FOUND THEN
    UPDATE public.newsletter_subscribers
      SET status = 'subscribed', unsubscribed_at = NULL, token = gen_random_uuid(), source = left(p_source, 50)
      WHERE id = sub.id
      RETURNING * INTO sub;
    RETURN jsonb_build_object('status', 'resubscribed', 'token', sub.token);
  END IF;

  INSERT INTO public.newsletter_subscribers (email, source) VALUES (addr, left(p_source, 50)) RETURNING * INTO sub;
  RETURN jsonb_build_object('status', 'subscribed', 'token', sub.token);
END;
$$;

CREATE OR REPLACE FUNCTION public.newsletter_unsubscribe(p_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.newsletter_subscribers
    SET status = 'unsubscribed', unsubscribed_at = coalesce(unsubscribed_at, now())
    WHERE token = p_token;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.newsletter_subscribe(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.newsletter_unsubscribe(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.newsletter_subscribe(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.newsletter_unsubscribe(uuid) TO anon, authenticated;

-- Deleted subscribers and campaigns go to Recently Deleted too.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['newsletter_subscribers', 'newsletter_campaigns'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS capture_deleted_row ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER capture_deleted_row AFTER DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.capture_deleted_row()', t);
  END LOOP;
END $$;

-- Sign-ups collected so far landed in Messages ("Newsletter signup"); carry them over.
INSERT INTO public.newsletter_subscribers (email, source, created_at)
SELECT DISTINCT ON (lower(trim(email))) lower(trim(email)), 'footer (before newsletter)', created_at
FROM public.contact_messages
WHERE subject = 'Newsletter signup' AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
ORDER BY lower(trim(email)), created_at
ON CONFLICT DO NOTHING;
