export interface ContactInfo {
  phone: string;
  email: string;
  address_line1: string;
  address_line2: string;
  working_hours: string;
  // Structured address used for LocalBusiness schema. Optional for records saved
  // before these fields existed; see postalAddressOf() for the fallback.
  street_address?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country?: string;
  logo_url?: string;
  social_links: {
    facebook: string;
    twitter: string;
    linkedin: string;
    instagram: string;
  };
}

export const defaultContactInfo: ContactInfo = {
  phone: '+1 469 767 8853',
  email: 'service@mbmts.com',
  address_line1: '555 N. 5th St, Suite 109',
  address_line2: 'Garland, TX 75040',
  working_hours: 'Mon–Fri: 8 AM – 5 PM CST',
  // Left blank so saved address lines are parsed until an admin fills these in.
  street_address: '',
  city: '',
  region: '',
  postal_code: '',
  country: 'US',
  logo_url: '',
  social_links: {
    facebook: '',
    twitter: '',
    linkedin: '',
    instagram: ''
  }
};

/** schema.org PostalAddress fields, falling back to parsing "City, ST 12345" from address line 2. */
export function postalAddressOf(info: ContactInfo) {
  const parsed = /^\s*([^,]+),\s*([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)\s*$/.exec(info.address_line2 || '');
  return {
    streetAddress: info.street_address || info.address_line1 || undefined,
    addressLocality: info.city || parsed?.[1]?.trim() || undefined,
    addressRegion: info.region || parsed?.[2]?.toUpperCase() || undefined,
    postalCode: info.postal_code || parsed?.[3] || undefined,
    addressCountry: info.country || 'US',
  };
}
