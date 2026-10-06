-- Admin-managed content pages (legal pages and any other simple page), served at /{slug}
-- and optionally linked from the site footer.

CREATE TABLE IF NOT EXISTS public.site_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  content_html text NOT NULL DEFAULT '',
  meta_title text,
  meta_description text,
  custom_schema text,
  published boolean NOT NULL DEFAULT true,
  show_in_footer boolean NOT NULL DEFAULT true,
  footer_label text,
  footer_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Top-level paths already used by the app can't be taken by a page.
  CONSTRAINT site_pages_slug_not_reserved CHECK (slug NOT IN (
    'admin', 'api', 'assets', 'images', 'auth', 'account', 'cart', 'checkout', 'orders',
    'products', 'product', 'category', 'gallery', 'services', 'parts', 'part', 'blog',
    'faq', 'about-us', 'contact-us', 'sitemap', 'sitemap-xml', 'robots', 'favicon'
  ))
);

ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published pages" ON public.site_pages;
CREATE POLICY "Anyone can view published pages"
  ON public.site_pages FOR SELECT
  USING (published = true);

DROP POLICY IF EXISTS "Admins can manage pages" ON public.site_pages;
CREATE POLICY "Admins can manage pages"
  ON public.site_pages FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT ON public.site_pages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_pages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_pages TO service_role;

DROP TRIGGER IF EXISTS update_site_pages_updated_at ON public.site_pages;
CREATE TRIGGER update_site_pages_updated_at
  BEFORE UPDATE ON public.site_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Same slug rules and automatic 301s as products, services, blog, etc.
DROP TRIGGER IF EXISTS validate_slug ON public.site_pages;
CREATE TRIGGER validate_slug BEFORE INSERT OR UPDATE OF slug ON public.site_pages
  FOR EACH ROW EXECUTE FUNCTION public.validate_slug();

DROP TRIGGER IF EXISTS track_slug_redirect ON public.site_pages;
CREATE TRIGGER track_slug_redirect AFTER INSERT OR UPDATE OF slug ON public.site_pages
  FOR EACH ROW EXECUTE FUNCTION public.track_slug_redirect('/', 'true');

-- Seed the three existing legal pages with their current text (previously hard-coded).
INSERT INTO public.site_pages (title, slug, meta_title, meta_description, footer_label, footer_order, content_html)
VALUES
('Privacy Policy for Mr. Bed Med', 'privacy', 'Privacy Policy | Mr.Bedmed',
 'Privacy Policy for Mr. Bed Med — how we collect, use, and protect your personal information.',
 'Privacy Policy', 1,
 $html$<p>At Mr. Bed Med, your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your personal information when you visit our website or use our services. By using our website, you agree to this policy.</p>
<h2>Information We Collect</h2>
<ul><li><p><strong>Personal Information:</strong> Name, email, phone number, billing/shipping address, or any information you provide during inquiries or purchases.</p></li><li><p><strong>Usage Information:</strong> Pages visited, time spent, and interactions on our website.</p></li><li><p><strong>Device Information:</strong> Browser type, IP address, operating system, and other technical details.</p></li><li><p><strong>Payment Information:</strong> Details provided during secure transactions via our payment gateway.</p></li></ul>
<h2>How We Use Your Information</h2>
<ul><li><p>To process orders and provide services.</p></li><li><p>To respond to inquiries and share updates or promotions.</p></li><li><p>To improve website functionality and user experience.</p></li><li><p>To prevent fraud and ensure security.</p></li><li><p>To comply with legal obligations.</p></li></ul>
<h2>Sharing Your Information</h2>
<p>We do not sell your information. Sharing may occur with:</p>
<ul><li><p><strong>Service Providers:</strong> For payments, delivery, and marketing support.</p></li><li><p><strong>Legal Authorities:</strong> When required by law.</p></li><li><p><strong>Business Transfers:</strong> During mergers or acquisitions, customer data may transfer.</p></li></ul>
<h2>Cookies and Tracking</h2>
<p>Cookies enhance your browsing experience. They remember preferences, analyze trends, and personalize content. You can disable cookies, but some features may not work properly.</p>
<h2>Data Security</h2>
<p>We use encryption, secure servers, and access controls to protect your data. No method of online transmission is fully secure, so we cannot guarantee absolute protection.</p>
<h2>Your Rights</h2>
<p>You can access, correct, or delete your personal information. Opt out of marketing emails anytime via the unsubscribe link or by contacting us.</p>
<h2>Children's Privacy</h2>
<p>We do not knowingly collect data from children under 18. If discovered, such data will be deleted.</p>
<h2>Policy Updates</h2>
<p>Changes will be posted here with a revision date. Review regularly for updates.</p>
<h2>Contact Us</h2>
<p>Mr. Bed Med<br>555 N. 5th St, Suite 109 B, Garland, TX 75040<br>Phone: +1 469 767 8853<br>Email: service@mbmts.com</p>$html$),

('Terms of Service for Mr. Bed Med', 'terms', 'Terms of Service | Mr.Bedmed',
 'Terms of Service for Mr. Bed Med — governing your use of our website and services.',
 'Terms of Service', 2,
 $html$<p>Welcome to https://mrbedmed.com/. These Terms of Service ("Terms") govern your use of our website and services. By using our website, you agree to these Terms.</p>
<h2>Acceptance of Terms</h2>
<p>Accessing or using our website means you accept these Terms. If you disagree, please do not use our website.</p>
<h2>Services</h2>
<p>Mr. Bed Med provides hospital beds, biomedical equipment, parts, accessories, and related services across Texas. We may modify or discontinue services at any time.</p>
<h2>Account Registration</h2>
<p>Some website features require registration. You must provide accurate information and keep your account secure. You are responsible for all activity under your account.</p>
<h2>Orders and Payments</h2>
<ul><li><p>Orders are subject to availability.</p></li><li><p>Prices may change without notice.</p></li><li><p>Payments are securely processed via approved methods.</p></li><li><p>Accurate billing information is required.</p></li></ul>
<h2>Shipping and Delivery</h2>
<p>We aim for timely delivery. Delivery times may vary. Risk passes to the customer upon delivery.</p>
<h2>Returns and Refunds</h2>
<ul><li><p>Products can be returned according to our Return Policy.</p></li><li><p>Refunds are processed via the original payment method.</p></li><li><p>Custom orders may not be returnable.</p></li></ul>
<h2>Website Use</h2>
<p>You agree not to:</p>
<ul><li><p>Violate laws or regulations.</p></li><li><p>Engage in fraudulent activity.</p></li><li><p>Interfere with website security or functionality.</p></li><li><p>Post harmful content.</p></li></ul>
<h2>Intellectual Property</h2>
<p>All website content, logos, and images belong to Mr. Bed Med and cannot be reproduced without permission.</p>
<h2>Limitation of Liability</h2>
<p>Mr. Bed Med is not liable for indirect, incidental, or consequential damages. Total liability is limited to the amount paid for the product or service.</p>
<h2>Indemnification</h2>
<p>You agree to defend and hold Mr. Bed Med harmless from claims arising from your violation of these Terms.</p>
<h2>Governing Law</h2>
<p>These Terms are governed by Texas law. Disputes are subject to Garland, TX courts.</p>
<h2>Changes</h2>
<p>Terms may be updated anytime. Continued use of the website constitutes acceptance of changes.</p>
<h2>Contact Information</h2>
<p>Mr. Bed Med<br>555 N. 5th St, Suite 109 B, Garland, TX 75040<br>Phone: +1 469 767 8853<br>Email: service@mbmts.com</p>$html$),

('Warranty Information for Mr. Bed Med Products', 'warranty', 'Warranty Information | Mr.Bedmed',
 'Warranty Information for Mr. Bed Med products — coverage, claims, and support details.',
 'Warranty Info', 3,
 $html$<p>Mr. Bed Med provides high-quality hospital beds and biomedical equipment. This warranty ensures product reliability and support.</p>
<h2>Standard Warranty</h2>
<p>All products are covered for 12 months against defects in materials and workmanship unless specified otherwise.</p>
<h2>Warranty Coverage</h2>
<ul><li><p>Repair or replacement of defective parts.</p></li><li><p>Labor costs for authorized repairs.</p></li><li><p>Technical support for product functionality issues.</p></li></ul>
<h2>Exclusions</h2>
<ul><li><p>Damage from misuse, accidents, or neglect.</p></li><li><p>Unauthorized modifications or repairs.</p></li><li><p>Normal wear and tear, consumables, or cosmetic issues.</p></li><li><p>Use outside recommended conditions.</p></li></ul>
<h2>Claim Process</h2>
<ol><li><p>Contact support with proof of purchase and issue details.</p></li><li><p>Our team assesses the problem and guides repair or replacement.</p></li><li><p>Ship the product securely if required.</p></li><li><p>We repair or replace the product within a reasonable timeframe.</p></li></ol>
<h2>Limitations</h2>
<ul><li><p>Warranty is non-transferable and valid for the original purchaser.</p></li><li><p>Indirect, incidental, or consequential damages are not covered.</p></li></ul>
<h2>Extended Warranty</h2>
<p>Optional extended plans may cover additional years or specific components. Details provided at purchase.</p>
<h2>Maintenance</h2>
<p>Follow instructions for cleaning, calibration, and preventive maintenance to ensure product longevity.</p>
<h2>Technical Support</h2>
<p>Our team provides assistance for troubleshooting, installation, and guidance.</p>
<h2>Product-Specific Terms</h2>
<p>Custom or specialized products may have different warranty terms. Contact us for details.</p>
<h2>Contact for Warranty Assistance</h2>
<p>Mr. Bed Med<br>555 N. 5th St, Suite 109 B, Garland, TX 75040<br>Phone: +1 469 767 8853<br>Email: service@mbmts.com</p>$html$)
ON CONFLICT (slug) DO NOTHING;
