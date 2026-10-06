import { describe, expect, it } from 'vitest';
import { productSchema, serviceSchema, blogPostingSchema, breadcrumbSchema, parseCustomSchema, faqPageSchema } from './schema';
import { defaultContactInfo } from '@/lib/contactInfo';

// JSON round-trip drops undefined fields, exactly like the page output.
const out = (o: unknown) => JSON.parse(JSON.stringify(o));

describe('productSchema', () => {
  it('matches the agreed Product shape (stryker-1007-stretcher)', () => {
    const schema = out(productSchema({
      name: 'Stryker 1007 Stretcher',
      path: '/products/stryker-1007-stretcher',
      image: 'https://cdn.example.com/stryker.png',
      description: 'Refurbished Stryker 1007 (SM104 M-Series) emergency transport stretcher, 700 lb capacity.',
      brand: 'Stryker',
      price: 1800,
      inStock: true,
      condition: 'refurbished',
    }));
    expect(schema).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Stryker 1007 Stretcher',
      url: 'https://mrbedmed.com/products/stryker-1007-stretcher',
      image: 'https://cdn.example.com/stryker.png',
      description: 'Refurbished Stryker 1007 (SM104 M-Series) emergency transport stretcher, 700 lb capacity.',
      brand: { '@type': 'Brand', name: 'Stryker' },
      offers: {
        '@type': 'Offer',
        url: 'https://mrbedmed.com/products/stryker-1007-stretcher',
        price: '1800.00',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        itemCondition: 'https://schema.org/RefurbishedCondition',
        seller: { '@type': 'Organization', name: 'Mrbedmed' },
      },
    });
  });

  it('handles out of stock, used condition, relative image and no brand', () => {
    const schema = out(productSchema({ name: 'X', path: '/part/x', image: '/img.png', price: 5, inStock: false, condition: 'used' }));
    expect(schema.offers.availability).toBe('https://schema.org/OutOfStock');
    expect(schema.offers.itemCondition).toBe('https://schema.org/UsedCondition');
    expect(schema.image).toBe('https://mrbedmed.com/img.png');
    expect(schema.brand).toBeUndefined();
  });

  it('uses plain text for HTML descriptions', () => {
    const schema = out(productSchema({ name: 'X', path: '/p', description: '<p>Hello <b>there</b></p>', price: 1, inStock: true }));
    expect(schema.description).toBe('Hello there');
  });
});

describe('serviceSchema', () => {
  it('builds Service with LocalBusiness provider from contact info', () => {
    const schema = out(serviceSchema({
      name: 'Medical Equipment Rental',
      path: '/services/equipment-rental',
      description: 'Short- and long-term rental of hospital beds and stretchers for Texas healthcare facilities.',
      areasServed: ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth'],
      contact: { ...defaultContactInfo, phone: '+1-469-767-8853', address_line1: '555 N. 5th St, Suite 109 B', address_line2: 'Garland, TX 75040' },
    }));
    expect(schema['@type']).toBe('Service');
    expect(schema.url).toBe('https://mrbedmed.com/services/equipment-rental');
    expect(schema.areaServed).toEqual(['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth']);
    expect(schema.provider).toMatchObject({
      '@type': 'LocalBusiness',
      name: 'Mrbedmed',
      telephone: '+1-469-767-8853',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '555 N. 5th St, Suite 109 B',
        addressLocality: 'Garland',
        addressRegion: 'TX',
        postalCode: '75040',
        addressCountry: 'US',
      },
    });
  });

  it('prefers explicit structured address fields', () => {
    const schema = out(serviceSchema({
      name: 'S', path: '/services/s',
      contact: { ...defaultContactInfo, street_address: '1 Main', city: 'Dallas', region: 'TX', postal_code: '75201' },
    }));
    expect(schema.provider.address.addressLocality).toBe('Dallas');
    expect(schema.areaServed).toBeUndefined();
  });
});

describe('blogPostingSchema', () => {
  it('builds BlogPosting with publisher logo', () => {
    const schema = out(blogPostingSchema({
      title: 'Hospital Bed Sale in Dallas, TX',
      path: '/blog/hospital-bed-sale-in-dallas-tx',
      image: '/blog.jpg',
      author: 'Jane Doe',
      publishedAt: '2026-02-13T10:00:00Z',
      modifiedAt: '2026-02-14T10:00:00Z',
    }));
    expect(schema).toMatchObject({
      '@type': 'BlogPosting',
      headline: 'Hospital Bed Sale in Dallas, TX',
      url: 'https://mrbedmed.com/blog/hospital-bed-sale-in-dallas-tx',
      image: 'https://mrbedmed.com/blog.jpg',
      datePublished: '2026-02-13T10:00:00Z',
      dateModified: '2026-02-14T10:00:00Z',
      author: { '@type': 'Person', name: 'Jane Doe' },
      publisher: { '@type': 'Organization', name: 'Mrbedmed', logo: { '@type': 'ImageObject', url: 'https://mrbedmed.com/favicon.png' } },
    });
  });
});

describe('breadcrumbSchema', () => {
  it('starts at Home and numbers positions', () => {
    const schema = out(breadcrumbSchema([{ name: 'Products', path: '/products' }, { name: 'Stryker 1007 Stretcher', path: '/products/stryker-1007-stretcher' }]));
    expect(schema.itemListElement.map((i: { position: number; name: string }) => [i.position, i.name])).toEqual([
      [1, 'Home'], [2, 'Products'], [3, 'Stryker 1007 Stretcher'],
    ]);
    expect(schema.itemListElement[0].item).toBe('https://mrbedmed.com/');
  });
});

describe('faqPageSchema', () => {
  it('skips incomplete items and returns null when empty', () => {
    expect(faqPageSchema([{ question: 'Q', answer: '' }])).toBeNull();
    expect(out(faqPageSchema([{ question: 'Q?', answer: 'A.' }])).mainEntity).toHaveLength(1);
  });
});

describe('parseCustomSchema', () => {
  it('accepts empty input', () => {
    expect(parseCustomSchema('')).toEqual({ ok: true, value: null });
  });
  it('accepts an object or array of objects', () => {
    expect(parseCustomSchema('{"@context":"https://schema.org","@type":"FAQPage"}').ok).toBe(true);
    expect(parseCustomSchema('[{"@type":"A"},{"@type":"B"}]').ok).toBe(true);
  });
  it('tolerates a pasted script wrapper', () => {
    expect(parseCustomSchema('<script type="application/ld+json">{"@type":"FAQPage"}</script>').ok).toBe(true);
  });
  it('rejects invalid JSON and non-objects', () => {
    expect(parseCustomSchema('{bad json').ok).toBe(false);
    expect(parseCustomSchema('"string"').ok).toBe(false);
    expect(parseCustomSchema('[]').ok).toBe(false);
    expect(parseCustomSchema('{"name":"no type"}').ok).toBe(false);
  });
});
