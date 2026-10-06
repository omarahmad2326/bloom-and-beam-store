'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from '@/lib/router';
import { useQuery } from '@tanstack/react-query';
import { Phone, Mail, MapPin, Clock, Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useContactInfo, postalAddressOf } from '@/hooks/useContactInfo';
import { SEOHead } from '@/components/seo/SEOHead';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { JsonLd, CustomJsonLd } from '@/components/seo/JsonLd';
import RichContent from '@/components/RichContent';
import { CONTACT_SETTINGS_KEY, isValidMapEmbed, withContactDefaults } from '@/lib/contactPage';
import { faqPageSchema } from '@/lib/schema';
import { isContentEmpty } from '@/lib/content';
import { SITE_NAME, SITE_URL, absoluteUrl } from '@/lib/site';
import { queries } from '@/queries';

const Contact = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { contactInfo } = useContactInfo();

  const { data: content } = useQuery(queries.contactPage());
  const c = content ?? withContactDefaults(null);

  // Quote buttons link here with ?product=… or ?service=…
  useEffect(() => {
    const productName = searchParams.get('product');
    const serviceName = searchParams.get('service');
    if (productName) {
      setSubject(`Quote Request: ${productName}`);
      setMessage(`I am interested in getting a quote for the "${productName}". Please provide pricing and availability information.\n\nAdditional details:\n`);
    } else if (serviceName) {
      setSubject(`Service Request: ${serviceName}`);
      setMessage(`I would like to learn more about your "${serviceName}" service.\n\nFacility / location:\nDetails:\n`);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await supabase
      .from('contact_messages')
      .insert({ name, email, subject, message });

    if (error) {
      toast({ title: 'Error', description: 'Failed to send message. Please try again.', variant: 'destructive' });
    } else {
      toast({ title: 'Message Sent!', description: c.success_message });
      // Send email notification (fire-and-forget)
      supabase.functions.invoke('send-email', {
        body: { type: 'contact', data: { name, email, subject, message } }
      }).catch(console.error);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    }
    setIsSubmitting(false);
  };

  const phone = contactInfo.phone;
  const address = [contactInfo.address_line1, contactInfo.address_line2].filter((s) => s?.trim()).join(', ');
  const contactItems = [
    { icon: Phone, title: 'Phone', content: phone, href: phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : '' },
    { icon: Mail, title: 'Email', content: contactInfo.email, href: contactInfo.email ? `mailto:${contactInfo.email}` : '' },
    { icon: MapPin, title: 'Address', content: address, href: '' },
    { icon: Clock, title: 'Hours', content: contactInfo.working_hours, href: '' },
  ].filter((item) => item.content?.trim());

  const faqs = c.faqs.filter((f) => f.question.trim() && f.answer.trim());
  const cities = c.cities.filter((x) => x.trim());
  const mapUrl = isValidMapEmbed(c.map_embed_url) ? c.map_embed_url.trim() : '';
  const postal = postalAddressOf(contactInfo);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: c.meta_title,
    url: absoluteUrl('/contact-us'),
    description: c.meta_description,
    mainEntity: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      telephone: phone || undefined,
      email: contactInfo.email || undefined,
      address: postal.streetAddress ? { '@type': 'PostalAddress', ...postal } : undefined,
      contactPoint: phone
        ? { '@type': 'ContactPoint', telephone: phone, email: contactInfo.email || undefined, contactType: 'customer service', areaServed: 'US', availableLanguage: 'English' }
        : undefined,
    },
  };

  return (
    <Layout>
      <SEOHead title={c.meta_title} description={c.meta_description} canonicalUrl={absoluteUrl('/contact-us')} />
      <BreadcrumbSchema items={[{ name: 'Contact Us', path: '/contact-us' }]} />
      <JsonLd id="contact" data={schema} />
      <JsonLd id="faq" data={faqPageSchema(faqs)} />
      <CustomJsonLd value={c.custom_schema} />

      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-16">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">{c.h1}</h1>
            {c.intro && <p className="text-muted-foreground max-w-2xl mx-auto">{c.intro}</p>}
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h2 className="sr-only">{c.details_title}</h2>
              {contactItems.map((item) => (
                <div key={item.title} className="flex items-start gap-4 p-6 bg-card rounded-xl border card-hover">
                  <div className="w-12 h-12 shrink-0 bg-primary/10 rounded-lg flex items-center justify-center"><item.icon className="h-6 w-6 text-primary" aria-hidden="true" /></div>
                  <div>
                    <h3 className="font-display font-bold">{item.title}</h3>
                    {item.href
                      ? <a href={item.href} className="text-muted-foreground hover:text-primary transition-colors">{item.content}</a>
                      : <p className="text-muted-foreground">{item.content}</p>}
                  </div>
                </div>
              ))}
              {mapUrl && (
                <div className="overflow-hidden rounded-xl border">
                  <iframe
                    src={mapUrl}
                    title={c.map_title || 'Map'}
                    className="h-72 w-full"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="bg-card p-8 rounded-2xl border space-y-6 self-start">
              {c.form_title && <h2 className="font-display text-2xl font-bold">{c.form_title}</h2>}
              {c.form_intro && <p className="-mt-3 text-muted-foreground">{c.form_intro}</p>}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact-name" className="mb-2 block">Name</Label>
                  <Input id="contact-name" placeholder="Your name" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="contact-email" className="mb-2 block">Email</Label>
                  <Input id="contact-email" type="email" placeholder="your@email.com" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
              <div>
                <Label htmlFor="contact-subject" className="mb-2 block">Subject</Label>
                <Input id="contact-subject" placeholder="How can we help?" required value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="contact-message" className="mb-2 block">Message</Label>
                <Textarea id="contact-message" placeholder="Tell us more..." rows={5} required value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>
              <Button type="submit" className="w-full btn-shine" size="lg" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</> : (c.form_button || 'Send Message')}
              </Button>
            </form>
          </div>
        </div>
      </section>

      {(cities.length > 0 || !isContentEmpty(c.areas_html)) && (
        <section className="bg-muted/30 py-12 md:py-16">
          <div className="container max-w-4xl text-center">
            <h2 className="mb-6 font-display text-2xl font-bold md:text-3xl">{c.areas_title}</h2>
            <RichContent content={c.areas_html} className="mb-6 text-lg" />
            {cities.length > 0 && (
              <ul className="flex flex-wrap justify-center gap-3">
                {cities.map((city) => (
                  <li key={city} className="inline-flex items-center gap-1.5 rounded-full border bg-background px-4 py-2 font-medium">
                    <MapPin className="h-4 w-4 text-primary" aria-hidden="true" /> {city}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {faqs.length > 0 && (
        <section className="py-12 md:py-16">
          <div className="container max-w-3xl">
            <h2 className="mb-6 font-display text-2xl font-bold md:text-3xl">{c.faq_title}</h2>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                  <AccordionContent className="whitespace-pre-line text-muted-foreground">{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      )}

      {!isContentEmpty(c.extra_html) && (
        <section className="py-12 md:py-16">
          <div className="container max-w-3xl">
            {c.extra_title && <h2 className="mb-6 font-display text-2xl font-bold md:text-3xl">{c.extra_title}</h2>}
            <RichContent content={c.extra_html} />
          </div>
        </section>
      )}
    </Layout>
  );
};

export default Contact;
