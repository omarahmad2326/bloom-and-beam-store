import { useState } from 'react';
import { Link } from '@/lib/router';
import { useQuery } from '@tanstack/react-query';
import { Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useContactInfo } from '@/hooks/useContactInfo';
import { supabase } from '@/integrations/supabase/client';
import { isInternalUrl, renderCopyright, withFooterDefaults, type FooterLink } from '@/lib/footer';
import { queries } from '@/queries';
import { cn } from '@/lib/utils';

// Static class names so Tailwind keeps them.
const LG_COLS: Record<number, string> = {
  1: 'lg:grid-cols-1', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5', 6: 'lg:grid-cols-6',
};

function FooterAnchor({ link, className }: { link: FooterLink; className?: string }) {
  if (isInternalUrl(link.url)) return <Link to={link.url} className={className}>{link.label}</Link>;
  const external = /^https?:/i.test(link.url);
  return (
    <a href={link.url} className={className} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {link.label}
    </a>
  );
}

export function Footer() {
  const { contactInfo } = useContactInfo();
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  // Footer content from Dashboard → Footer and pages marked "Show in footer" (both prefetched on the server).
  const { data: saved } = useQuery(queries.footer());
  const f = saved ?? withFooterDefaults(null);
  const { data: footerPages = [] } = useQuery({ ...queries.footerPages(), enabled: f.show_legal_links });

  const socialIcons = [
    { Icon: Facebook, url: contactInfo.social_links?.facebook, label: 'Facebook' },
    { Icon: Twitter, url: contactInfo.social_links?.twitter, label: 'X (Twitter)' },
    { Icon: Linkedin, url: contactInfo.social_links?.linkedin, label: 'LinkedIn' },
    { Icon: Instagram, url: contactInfo.social_links?.instagram, label: 'Instagram' },
  ].filter((s) => s.url?.trim());

  const columns = f.columns.filter((c) => c.title.trim() || c.links.length);
  const contactLines = [
    { Icon: MapPin, text: [contactInfo.address_line1, contactInfo.address_line2].filter((s) => s?.trim()), href: '' },
    { Icon: Phone, text: [contactInfo.phone].filter(Boolean), href: contactInfo.phone ? `tel:${contactInfo.phone.replace(/[^\d+]/g, '')}` : '' },
    { Icon: Mail, text: [contactInfo.email].filter(Boolean), href: contactInfo.email ? `mailto:${contactInfo.email}` : '' },
  ].filter((l) => l.text.length);
  const showContact = f.contact_enabled && contactLines.length > 0;
  const gridCount = Math.min(6, 1 + columns.length + (showContact ? 1 : 0));

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubscribing(true);
    // Sign-ups land in Dashboard → Messages.
    const { error } = await supabase.from('contact_messages').insert({
      name: 'Newsletter subscriber',
      email: email.trim(),
      subject: 'Newsletter signup',
      message: `Please add ${email.trim()} to the newsletter.`,
    });
    setSubscribing(false);
    if (error) {
      toast.error('Could not subscribe right now. Please try again.');
      return;
    }
    toast.success(f.newsletter_success || 'Thanks for subscribing!');
    setEmail('');
  };

  return (
    <footer className="bg-foreground text-background">
      {/* Newsletter */}
      {f.newsletter_enabled && (
        <div className="border-b border-background/10">
          <div className="container py-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                {f.newsletter_title && <h3 className="font-display text-2xl font-bold mb-2">{f.newsletter_title}</h3>}
                {f.newsletter_text && <p className="text-background/70">{f.newsletter_text}</p>}
              </div>
              <form onSubmit={subscribe} className="flex w-full md:w-auto gap-3">
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={f.newsletter_placeholder}
                  aria-label={f.newsletter_placeholder || 'Email address'}
                  className="bg-background/10 border-background/20 text-background placeholder:text-background/50 w-full md:w-64"
                />
                <Button type="submit" disabled={subscribing} className="btn-shine bg-secondary hover:bg-secondary/90">
                  {subscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : f.newsletter_button}
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Main footer */}
      <div className="container py-16">
        <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-12', LG_COLS[gridCount])}>
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-6">
              {f.logo_url ? (
                <img src={f.logo_url} alt={f.logo_alt || `${f.brand_name_start}${f.brand_name_highlight}`} className="h-10 w-auto" />
              ) : (
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-display font-bold text-xl">
                    {(f.brand_name_highlight || f.brand_name_start || 'M').charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              {(f.brand_name_start || f.brand_name_highlight) && (
                <span className="font-display font-bold text-2xl">
                  {f.brand_name_start}<span className="text-primary">{f.brand_name_highlight}</span>
                </span>
              )}
            </Link>
            {f.description && <p className="text-background/70 mb-6 whitespace-pre-line">{f.description}</p>}
            {f.show_social && socialIcons.length > 0 && (
              <div className="flex gap-4">
                {socialIcons.map(({ Icon, url, label }) => (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="w-10 h-10 bg-background/10 rounded-full flex items-center justify-center hover:bg-primary transition-colors"
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Link columns */}
          {columns.map((column, i) => (
            <div key={`${column.title}-${i}`}>
              {column.title && <h4 className="font-display font-bold text-lg mb-6">{column.title}</h4>}
              <ul className="space-y-3">
                {column.links.filter((l) => l.label.trim() && l.url.trim()).map((link, j) => (
                  <li key={`${link.url}-${j}`}>
                    <FooterAnchor link={link} className="text-background/70 hover:text-primary transition-colors" />
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact (values from Contact Info) */}
          {showContact && (
            <div>
              {f.contact_title && <h4 className="font-display font-bold text-lg mb-6">{f.contact_title}</h4>}
              <ul className="space-y-4">
                {contactLines.map(({ Icon, text, href }, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Icon className="h-5 w-5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                    {href ? (
                      <a href={href} className="text-background/70 hover:text-primary transition-colors">{text.join(' ')}</a>
                    ) : (
                      <span className="text-background/70">
                        {text.map((line, k) => <span key={k} className="block">{line}</span>)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Important notice */}
      {f.notice_enabled && f.notice_text.trim() && (
        <div className="border-t border-background/10">
          <div className="container py-6">
            <div className="flex items-start md:items-center justify-center gap-3 rounded-xl bg-background/5 px-5 py-4">
              <Info className="h-4 w-4 shrink-0 text-primary/70 mt-0.5 md:mt-0" aria-hidden="true" />
              <p className="text-background/60 text-sm leading-relaxed text-left md:text-center max-w-4xl">
                {f.notice_title && <><span className="font-medium text-background/80">{f.notice_title}</span>{' '}</>}
                {f.notice_text}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div className="border-t border-background/10">
        <div className="container py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          {f.copyright && <p className="text-background/50 text-sm">{renderCopyright(f.copyright)}</p>}
          {f.show_legal_links && footerPages.length > 0 && (
            <nav aria-label="Legal" className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-background/50">
              {footerPages.map((page) => (
                <Link key={page.slug} to={`/${page.slug}`} className="hover:text-primary transition-colors">
                  {page.footer_label || page.title}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </div>
    </footer>
  );
}
