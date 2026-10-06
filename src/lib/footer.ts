export interface FooterLink {
  label: string;
  url: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export interface FooterContent {
  newsletter_enabled: boolean;
  newsletter_title: string;
  newsletter_text: string;
  newsletter_placeholder: string;
  newsletter_button: string;
  newsletter_success: string;
  brand_name_start: string;
  brand_name_highlight: string;
  logo_url: string;
  logo_alt: string;
  description: string;
  show_social: boolean;
  columns: FooterColumn[];
  contact_enabled: boolean;
  contact_title: string;
  notice_enabled: boolean;
  notice_title: string;
  notice_text: string;
  copyright: string;
  show_legal_links: boolean;
}

export const FOOTER_SETTINGS_KEY = 'footer';

/** Defaults reproduce the footer as it was hard-coded, so nothing changes until an admin edits it. */
export const DEFAULT_FOOTER: FooterContent = {
  newsletter_enabled: true,
  newsletter_title: 'Stay Updated',
  newsletter_text: 'Get the latest news on medical equipment innovations',
  newsletter_placeholder: 'Enter your email',
  newsletter_button: 'Subscribe',
  newsletter_success: "Thanks for subscribing! We'll keep you posted.",
  brand_name_start: 'Mr.',
  brand_name_highlight: 'Bedmed',
  logo_url: '',
  logo_alt: '',
  description: 'Hospital beds, stretchers and biomedical equipment services for healthcare facilities across Texas.',
  show_social: true,
  columns: [
    {
      title: 'Quick Links',
      links: [
        { label: 'Products', url: '/products' },
        { label: 'Services', url: '/services' },
        { label: 'Parts', url: '/parts' },
        { label: 'FAQ', url: '/faq' },
        { label: 'About Us', url: '/about-us' },
        { label: 'Contact', url: '/contact-us' },
      ],
    },
    {
      title: 'Products',
      links: [
        { label: 'ER Stretchers', url: '/category/er-stretcher' },
        { label: 'EMS Stretcher', url: '/category/ems-stretcher' },
        { label: 'ICU Beds', url: '/category/icu-beds' },
        { label: 'Patients Recliner', url: '/category/patient-recliner' },
        { label: 'Spare Parts', url: '/parts' },
      ],
    },
  ],
  contact_enabled: true,
  contact_title: 'Contact Us',
  notice_enabled: true,
  notice_title: 'Important Notice:',
  notice_text:
    'Our contact details may appear on invoices not issued by us. Please verify all invoices directly with our team before making any payment. We accept no liability for payments made against invoices not issued or authorized by us.',
  copyright: '© {year} Mr.Bedmed. All rights reserved.',
  show_legal_links: true,
};

export function withFooterDefaults(saved: unknown): FooterContent {
  const value = (saved && typeof saved === 'object' ? saved : {}) as Partial<FooterContent>;
  return { ...DEFAULT_FOOTER, ...value };
}

/** Site paths, full URLs, mailto: and tel: links are allowed. */
export function isValidFooterUrl(url: string): boolean {
  const u = url.trim();
  return /^\/(?!\/)/.test(u) || /^https?:\/\/[^\s]+$/i.test(u) || /^mailto:[^\s@]+@[^\s@]+$/i.test(u) || /^tel:\+?[\d\s()-]+$/i.test(u);
}

export const isInternalUrl = (url: string) => /^\/(?!\/)/.test(url.trim());

export function renderCopyright(text: string, now = new Date()): string {
  return text.replace(/\{year\}/gi, String(now.getFullYear()));
}
