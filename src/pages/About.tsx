import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Mail, MapPin, Phone } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { SEOHead } from '@/components/seo/SEOHead';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { JsonLd, CustomJsonLd } from '@/components/seo/JsonLd';
import RichContent from '@/components/RichContent';
import { QuoteButton } from '@/components/QuoteButton';
import { supabase } from '@/integrations/supabase/client';
import { useContactInfo, postalAddressOf } from '@/hooks/useContactInfo';
import { ABOUT_ICONS, ABOUT_SETTINGS_KEY, withAboutDefaults, type AboutCard } from '@/lib/aboutPage';
import { isContentEmpty } from '@/lib/content';
import { SITE_NAME, SITE_URL, DEFAULT_LOGO_PATH, absoluteUrl } from '@/lib/site';
import { cn } from '@/lib/utils';

function CardLink({ link, children, className }: { link: string; children: React.ReactNode; className?: string }) {
  if (!link) return <div className={className}>{children}</div>;
  if (/^https?:\/\//i.test(link)) {
    return <a href={link} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>;
  }
  return <Link to={link} className={className}>{children}</Link>;
}

function IconCard({ card, showMore }: { card: AboutCard; showMore?: boolean }) {
  const Icon = ABOUT_ICONS[card.icon] ?? ABOUT_ICONS.BadgeCheck;
  return (
    <CardLink
      link={card.link}
      className={cn(
        'group flex h-full flex-col rounded-2xl border bg-card p-6 transition-shadow',
        card.link && 'hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
      </div>
      <h3 className="font-display text-lg font-bold group-hover:text-primary transition-colors">{card.title}</h3>
      {card.text && <p className="mt-2 text-muted-foreground leading-relaxed">{card.text}</p>}
      {showMore && card.link && (
        <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-primary">
          Learn more <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      )}
    </CardLink>
  );
}

const About = () => {
  const { contactInfo } = useContactInfo();
  const { data: content } = useQuery({
    queryKey: ['site-setting', ABOUT_SETTINGS_KEY],
    queryFn: async () => {
      const { data } = await supabase.from('site_settings').select('value').eq('key', ABOUT_SETTINGS_KEY).maybeSingle();
      return withAboutDefaults(data?.value);
    },
  });
  const c = content ?? withAboutDefaults(null);

  const phone = contactInfo.phone || '+1 469 767 8853';
  const tel = `tel:${phone.replace(/[^\d+]/g, '')}`;
  const email = contactInfo.email;
  const address = postalAddressOf(contactInfo);
  const whatCards = c.what_cards.filter((x) => x.title.trim());
  const whyCards = c.why_cards.filter((x) => x.title.trim());
  const stats = c.stats.filter((s) => s.value.trim() && s.label.trim());
  const team = c.team.filter((m) => m.name.trim());
  const cities = c.cities.filter((x) => x.trim());
  const hasWho = !isContentEmpty(c.who_html) || !!c.founding_story.trim();
  const hasMission = !isContentEmpty(c.mission_html);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: c.meta_title,
    url: absoluteUrl('/about-us'),
    description: c.meta_description,
    mainEntity: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: absoluteUrl(contactInfo.logo_url || DEFAULT_LOGO_PATH),
      telephone: phone,
      email: email || undefined,
      address: address.streetAddress ? { '@type': 'PostalAddress', ...address } : undefined,
      areaServed: cities.length ? cities.map((name) => ({ '@type': 'City', name })) : undefined,
    },
  };

  return (
    <Layout>
      <SEOHead title={c.meta_title} description={c.meta_description} canonicalUrl={absoluteUrl('/about-us')} />
      <BreadcrumbSchema items={[{ name: 'About Us', path: '/about-us' }]} />
      <JsonLd id="about" data={schema} />
      <CustomJsonLd value={c.custom_schema} />

      {/* 1. H1 */}
      <section className="bg-gradient-to-b from-primary/10 to-background py-16 md:py-24">
        <div className="container text-center">
          <h1 className="mx-auto max-w-4xl font-display text-3xl font-bold leading-tight md:text-5xl">{c.h1}</h1>
          {c.intro && <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">{c.intro}</p>}
        </div>
      </section>

      {/* 2. Who We Are + 3. Our Mission */}
      {(hasWho || hasMission) && (
        <section className="py-12 md:py-16">
          <div className={cn('container grid gap-10', hasWho && hasMission && 'lg:grid-cols-5 lg:gap-12')}>
            {hasWho && (
              <div className={cn(hasMission && 'lg:col-span-3')}>
                <h2 className="mb-6 font-display text-2xl font-bold md:text-3xl">{c.who_title}</h2>
                <RichContent content={c.who_html} className="text-lg" />
                {c.founding_story.trim() && (
                  <blockquote className="mt-6 rounded-r-xl border-l-4 border-primary bg-muted/40 p-5 text-lg italic text-foreground">
                    {c.founding_story}
                  </blockquote>
                )}
              </div>
            )}
            {hasMission && (
              <div className={cn('rounded-2xl bg-primary p-8 text-primary-foreground', hasWho && 'lg:col-span-2 self-start')}>
                <h2 className="mb-4 font-display text-2xl font-bold">{c.mission_title}</h2>
                <RichContent content={c.mission_html} className="text-lg [&_*]:text-primary-foreground" />
              </div>
            )}
          </div>
        </section>
      )}

      {/* 4. What We Do */}
      {whatCards.length > 0 && (
        <section className="bg-muted/30 py-12 md:py-16">
          <div className="container">
            <h2 className="mb-8 text-center font-display text-2xl font-bold md:text-3xl">{c.what_title}</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {whatCards.map((card, i) => <IconCard key={i} card={card} showMore />)}
            </div>
          </div>
        </section>
      )}

      {/* 5. Why Choose */}
      {whyCards.length > 0 && (
        <section className="py-12 md:py-16">
          <div className="container">
            <h2 className="mb-8 text-center font-display text-2xl font-bold md:text-3xl">{c.why_title}</h2>
            <div className="flex flex-wrap justify-center gap-6">
              {whyCards.map((card, i) => (
                <div key={i} className="w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)]">
                  <IconCard card={card} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 6. Stats (only owner-confirmed numbers are entered) */}
      {stats.length > 0 && (
        <section className="bg-primary py-12 text-primary-foreground">
          <div className="container">
            <dl className="grid grid-cols-2 gap-6 text-center md:flex md:justify-center md:gap-16">
              {stats.map((s, i) => (
                <div key={i}>
                  <dt className="sr-only">{s.label}</dt>
                  <dd className="font-display text-4xl font-bold">{s.value}</dd>
                  <dd className="mt-1 text-primary-foreground/80">{s.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}

      {/* 7. Our Team */}
      {team.length > 0 && (
        <section className="py-12 md:py-16">
          <div className="container">
            <h2 className="mb-8 text-center font-display text-2xl font-bold md:text-3xl">{c.team_title}</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {team.map((m, i) => (
                <figure key={i} className="overflow-hidden rounded-2xl border bg-card">
                  {m.photo_url ? (
                    <img src={m.photo_url} alt={m.photo_alt || `${m.name}, ${m.role}`} loading="lazy" className="aspect-[4/5] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[4/5] w-full items-center justify-center bg-muted font-display text-4xl font-bold text-muted-foreground" aria-hidden="true">
                      {m.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('')}
                    </div>
                  )}
                  <figcaption className="p-5">
                    <p className="font-display text-lg font-bold">{m.name}</p>
                    {m.role && <p className="text-primary">{m.role}</p>}
                    {m.years && <p className="mt-1 text-sm text-muted-foreground">{m.years}</p>}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 8. Serving Texas */}
      {(cities.length > 0 || !isContentEmpty(c.areas_html)) && (
        <section className="bg-muted/30 py-12 md:py-16">
          <div className="container max-w-4xl text-center">
            <h2 className="mb-6 font-display text-2xl font-bold md:text-3xl">{c.areas_title}</h2>
            <RichContent content={c.areas_html} className="mb-6 text-lg" />
            <ul className="flex flex-wrap justify-center gap-3">
              {cities.map((city) => (
                <li key={city} className="inline-flex items-center gap-1.5 rounded-full border bg-background px-4 py-2 font-medium">
                  <MapPin className="h-4 w-4 text-primary" aria-hidden="true" /> {city}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* 9. Get in Touch */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-2xl border bg-card p-8 text-center shadow-sm md:p-12">
            <h2 className="mb-4 font-display text-2xl font-bold md:text-3xl">{c.contact_title}</h2>
            {c.contact_text && <p className="mb-8 text-lg text-muted-foreground">{c.contact_text}</p>}
            <QuoteButton to="/contact-us" showArrow={false} className="mb-8">Get a Quote</QuoteButton>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-8">
              <a href={tel} className="inline-flex items-center gap-2 font-medium hover:text-primary">
                <Phone className="h-5 w-5 text-primary" aria-hidden="true" /> {phone}
              </a>
              {email && (
                <a href={`mailto:${email}`} className="inline-flex items-center gap-2 font-medium hover:text-primary">
                  <Mail className="h-5 w-5 text-primary" aria-hidden="true" /> {email}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;
