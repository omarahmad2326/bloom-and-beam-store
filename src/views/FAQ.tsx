'use client';

import { Layout } from '@/components/layout/Layout';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { SEOHead } from '@/components/seo/SEOHead';
import { FAQSchema } from '@/components/seo/FAQSchema';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { absoluteUrl } from '@/lib/site';
import { queries } from '@/queries';
import { useQuery } from '@tanstack/react-query';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const FAQ = () => {
  const { data: faqs = [], isLoading: loading } = useQuery(queries.faqs());


  // Group FAQs by category
  const groupedFaqs = faqs.reduce((acc, faq) => {
    if (!acc[faq.category]) {
      acc[faq.category] = [];
    }
    acc[faq.category].push(faq);
    return acc;
  }, {} as Record<string, FAQ[]>);

  const categories = Object.keys(groupedFaqs);

  return (
    <Layout>
      <BreadcrumbSchema items={[{ name: 'FAQ', path: '/faq' }]} />
      <SEOHead
        title="FAQ - Frequently Asked Questions | Mr.Bedmed"
        description="Find answers to common questions about Mr.Bedmed medical equipment, warranty, shipping, installation, and more."
        canonicalUrl={absoluteUrl('/faq')}
      />
      <FAQSchema faqs={faqs.map(f => ({ question: f.question, answer: f.answer }))} />

      <section className="py-16 md:py-24">
        <div className="container max-w-3xl">
          <div className="text-center mb-12">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">FAQ</h1>
            <p className="text-muted-foreground">Find answers to common questions</p>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : faqs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No FAQs available yet.
            </div>
          ) : categories.length === 1 ? (
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, i) => (
                <AccordionItem key={faq.id} value={`item-${i}`} className="bg-card border rounded-xl px-6">
                  <AccordionTrigger className="font-display font-bold hover:no-underline">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="space-y-8">
              {categories.map((category) => (
                <div key={category}>
                  <h2 className="text-xl font-bold mb-4 text-primary">{category}</h2>
                  <Accordion type="single" collapsible className="space-y-3">
                    {groupedFaqs[category].map((faq, i) => (
                      <AccordionItem key={faq.id} value={`${category}-${i}`} className="bg-card border rounded-xl px-6">
                        <AccordionTrigger className="font-display font-bold hover:no-underline">{faq.question}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default FAQ;
