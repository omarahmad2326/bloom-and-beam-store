'use client';

import { useParams, Navigate } from '@/lib/router';
import { Layout } from '@/components/layout/Layout';
import { SEOHead } from '@/components/seo/SEOHead';
import { JsonLd, CustomJsonLd } from '@/components/seo/JsonLd';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { RedirectOrFallback } from '@/components/RedirectOrFallback';
import RichContent from '@/components/RichContent';
import { QuoteButton } from '@/components/QuoteButton';
import { Phone, CheckCircle } from 'lucide-react';
import { useContactInfo } from '@/hooks/useContactInfo';
import { serviceSchema } from '@/lib/schema';
import { absoluteUrl } from '@/lib/site';
import { toPlainText } from '@/lib/content';
import type { Tables } from '@/integrations/supabase/types';
import { resolveAlt } from '@/lib/imageAlt';
import { CallButton } from '@/components/CallButton';
import { queries } from '@/queries';
import { useQuery } from '@tanstack/react-query';

type Service = Tables<'services'>;

const DEFAULT_HERO = 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1920&q=80';

const ServiceDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: service, isLoading: loading } = useQuery({ ...queries.service(slug ?? ''), enabled: !!slug });
  const notFound = !loading && !service;
  const { contactInfo } = useContactInfo();


  if (loading) {
    return (
      <Layout>
        <section className="py-16 md:py-24">
          <div className="container text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        </section>
      </Layout>
    );
  }

  if (notFound || !service) {
    return <RedirectOrFallback fallback={<Navigate to="/services" replace />} />;
  }

  const path = `/services/${service.slug}`;
  const overviewHtml =
    service.overview_html ||
    (service.overview || []).map((p) => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`).join('');
  const phone = contactInfo.phone || '+1 469 767 8853';

  return (
    <Layout>
      <SEOHead
        title={service.meta_title || `${service.title} | Mr.Bedmed Services`}
        description={service.meta_description || service.short_desc}
        canonicalUrl={absoluteUrl(path)}
        ogImage={absoluteUrl(service.image_url)}
      />
      <JsonLd
        id="service"
        data={serviceSchema({
          name: service.title,
          path,
          description: service.short_desc || toPlainText(overviewHtml, 300),
          areasServed: service.areas_served,
          image: service.image_url,
          contact: contactInfo,
        })}
      />
      <BreadcrumbSchema items={[{ name: 'Services', path: '/services' }, { name: service.title, path }]} />
      <CustomJsonLd value={service.custom_schema} />

      {/* Hero Section */}
      <section className="relative h-[300px] md:h-[400px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/70">
          {service.image_url ? (
            <img
              src={service.image_url}
              alt={resolveAlt(service.image_alt, service.title)}
              className="absolute inset-0 h-full w-full object-cover opacity-40"
            />
          ) : (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-40"
              style={{ backgroundImage: `url('${DEFAULT_HERO}')` }}
            />
          )}
        </div>
        <div className="container relative h-full flex items-center">
          <div className="max-w-2xl">
            <h1 className="font-display text-3xl md:text-5xl font-bold text-white leading-tight">
              {service.hero_title}
            </h1>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <h2 className="font-display text-2xl md:text-3xl font-bold mb-6">
                Service Overview
              </h2>
              <RichContent content={overviewHtml} />

              {/* Why Choose Section */}
              {(service.features ?? []).length > 0 && (
                <div className="mt-12">
                  <h3 className="font-display text-xl md:text-2xl font-bold mb-6">
                    {service.why_choose_title}
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {service.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(service.areas_served ?? []).length > 0 && (
                <div className="mt-12">
                  <h3 className="font-display text-xl md:text-2xl font-bold mb-4">Areas We Serve</h3>
                  <ul className="flex flex-wrap gap-2">
                    {(service.areas_served ?? []).map((city) => (
                      <li key={city} className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                        {city}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-card border rounded-2xl p-6 sticky top-24">
                <h3 className="font-display text-xl font-bold text-center mb-6">
                  Service Summary
                </h3>
                <QuoteButton
                  to={`/contact-us?service=${encodeURIComponent(service.title)}`}
                  className="w-full mb-4"
                  showArrow={false}
                >
                  Request a Quote
                </QuoteButton>
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className="hover:text-primary transition-colors">{phone}</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-16 bg-primary/5">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-muted-foreground mb-6">
              Contact our team today to discuss your {service.title.toLowerCase()} needs.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <QuoteButton
                to={`/contact-us?service=${encodeURIComponent(service.title)}`}
                showArrow={false}
              >
                Contact Us Today
              </QuoteButton>
              <CallButton tone="onLight" />
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ServiceDetail;
