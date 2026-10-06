import { JsonLd } from './JsonLd';
import { faqPageSchema } from '@/lib/schema';

interface FAQ {
  question: string;
  answer: string;
}

export function FAQSchema({ faqs }: { faqs: FAQ[] }) {
  return <JsonLd id="faq" data={faqPageSchema(faqs)} />;
}
