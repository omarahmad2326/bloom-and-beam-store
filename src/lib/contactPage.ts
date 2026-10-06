import type { FaqItem } from '@/components/admin/FaqListEditor';

export interface ContactPageContent {
  meta_title: string;
  meta_description: string;
  h1: string;
  intro: string;
  details_title: string;
  form_title: string;
  form_intro: string;
  form_button: string;
  success_message: string;
  map_embed_url: string;
  map_title: string;
  areas_title: string;
  areas_html: string;
  cities: string[];
  faq_title: string;
  faqs: FaqItem[];
  extra_title: string;
  extra_html: string;
  custom_schema: string;
}

export const CONTACT_SETTINGS_KEY = 'contact_page';

/** Defaults reproduce the current page, so nothing changes until the admin edits it. */
export const DEFAULT_CONTACT: ContactPageContent = {
  meta_title: 'Contact Mrbedmed | Hospital Beds & Stretchers in Texas',
  meta_description:
    'Contact Mrbedmed for hospital bed and stretcher sales, rentals, repairs and biomedical equipment services across Texas. Get a quote or send a message.',
  h1: 'Contact Us',
  intro: "Have questions? We'd love to hear from you.",
  details_title: 'Contact Details',
  form_title: 'Send Us a Message',
  form_intro: '',
  form_button: 'Send Message',
  success_message: "We'll get back to you within 24 hours.",
  map_embed_url: '',
  map_title: 'Mrbedmed location on Google Maps',
  areas_title: 'Areas We Serve',
  areas_html: '',
  cities: [],
  faq_title: 'Frequently Asked Questions',
  faqs: [],
  extra_title: '',
  extra_html: '',
  custom_schema: '',
};

export function withContactDefaults(saved: unknown): ContactPageContent {
  const value = (saved && typeof saved === 'object' ? saved : {}) as Partial<ContactPageContent>;
  return { ...DEFAULT_CONTACT, ...value };
}

/** Only Google Maps embed URLs are allowed in the map iframe. */
export function isValidMapEmbed(url: string): boolean {
  return /^https:\/\/(www\.)?google\.com\/maps\/embed\?/i.test(url.trim());
}

/** Accepts either the embed URL or the full <iframe …> snippet Google gives you; returns the URL. */
export function extractMapEmbedUrl(input: string): string {
  const value = input.trim();
  const fromIframe = /src=["']([^"']+)["']/i.exec(value);
  return (fromIframe ? fromIframe[1] : value).replace(/&amp;/g, '&');
}
