import {
  ShoppingCart, Package, ClipboardCheck, Recycle, House, MessageSquare, ShieldCheck, Clock, Wrench, Truck,
  Award, Users, HeartPulse, Stethoscope, BadgeCheck, MapPin, Headphones, ThumbsUp, Handshake, Building2,
  BedDouble, Gauge, DollarSign, Leaf, type LucideIcon,
} from 'lucide-react';
import { toPlainText } from '@/lib/content';

/** Icons the admin can pick for About page cards. */
export const ABOUT_ICONS: Record<string, LucideIcon> = {
  ShoppingCart, Package, ClipboardCheck, Recycle, House, MessageSquare, ShieldCheck, Clock, Wrench, Truck,
  Award, Users, HeartPulse, Stethoscope, BadgeCheck, MapPin, Headphones, ThumbsUp, Handshake, Building2,
  BedDouble, Gauge, DollarSign, Leaf,
};

export interface AboutCard {
  icon: string;
  title: string;
  text: string;
  link: string;
}

export interface AboutStat {
  value: string;
  label: string;
}

export interface AboutTeamMember {
  name: string;
  role: string;
  years: string;
  photo_url: string;
  photo_alt: string;
}

export interface AboutPageContent {
  meta_title: string;
  meta_description: string;
  h1: string;
  intro: string;
  who_title: string;
  who_html: string;
  founding_story: string;
  mission_title: string;
  mission_html: string;
  what_title: string;
  what_cards: AboutCard[];
  why_title: string;
  why_cards: AboutCard[];
  stats: AboutStat[];
  team_title: string;
  team: AboutTeamMember[];
  areas_title: string;
  areas_html: string;
  cities: string[];
  contact_title: string;
  contact_text: string;
  custom_schema: string;
}

export const ABOUT_SETTINGS_KEY = 'about_page';

/**
 * Defaults = only what the B1 brief states verbatim. Body copy, the Why-Choose cards, stats and
 * team are intentionally empty: their sections stay hidden until the admin enters approved text.
 */
export const DEFAULT_ABOUT: AboutPageContent = {
  meta_title: 'About Mrbedmed | Hospital Bed & Stretcher Supplier in Texas',
  meta_description:
    'Mrbedmed supplies, rents and services hospital beds, stretchers and biomedical equipment for Texas hospitals, clinics and care facilities.',
  h1: 'About Mrbedmed — Texas Healthcare Facilities’ Trusted Equipment Partner',
  intro: '',
  who_title: 'Who We Are',
  who_html: '',
  founding_story: '',
  mission_title: 'Our Mission',
  mission_html: '',
  what_title: 'What We Do',
  what_cards: [
    { icon: 'ShoppingCart', title: 'Sales', text: '', link: '/products' },
    { icon: 'Package', title: 'Rental', text: '', link: '/services/equipment-rental' },
    { icon: 'ClipboardCheck', title: 'Biomedical Equipment Inspection', text: '', link: '/services/biomedical-equipment-inspection' },
    { icon: 'Recycle', title: 'Dispositioning', text: '', link: '/services/disposition-asset-management' },
    { icon: 'House', title: 'Home Health', text: '', link: '' },
    { icon: 'MessageSquare', title: 'Consultancy', text: '', link: '/contact-us' },
  ],
  why_title: 'Why Healthcare Facilities Choose Mrbedmed',
  why_cards: [],
  stats: [],
  team_title: 'Our Team',
  team: [],
  areas_title: 'Serving Healthcare Facilities Across Texas',
  areas_html: '',
  cities: ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth'],
  contact_title: 'Get in Touch',
  contact_text: '',
  custom_schema: '',
};

/** Merge saved settings over defaults (tolerates records saved by older versions). */
export function withAboutDefaults(saved: unknown): AboutPageContent {
  const value = (saved && typeof saved === 'object' ? saved : {}) as Partial<AboutPageContent>;
  return { ...DEFAULT_ABOUT, ...value };
}

const words = (s: string | null | undefined) => {
  const text = toPlainText(s || '');
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
};

/** Approximate visible word count of the rendered page (headings, body, cards, team, cities, contact). */
export function aboutWordCount(c: AboutPageContent): number {
  const cardWords = (cards: AboutCard[]) => cards.reduce((n, card) => n + words(card.title) + words(card.text), 0);
  return (
    words(c.h1) + words(c.intro) +
    (c.who_html || c.founding_story ? words(c.who_title) + words(c.who_html) + words(c.founding_story) : 0) +
    (c.mission_html ? words(c.mission_title) + words(c.mission_html) : 0) +
    (c.what_cards.length ? words(c.what_title) + cardWords(c.what_cards) : 0) +
    (c.why_cards.length ? words(c.why_title) + cardWords(c.why_cards) : 0) +
    c.stats.reduce((n, s) => n + words(s.value) + words(s.label), 0) +
    (c.team.length ? words(c.team_title) + c.team.reduce((n, m) => n + words(m.name) + words(m.role) + words(m.years), 0) : 0) +
    (c.cities.length || c.areas_html ? words(c.areas_title) + words(c.areas_html) + c.cities.reduce((n, x) => n + words(x), 0) : 0) +
    words(c.contact_title) + words(c.contact_text)
  );
}
