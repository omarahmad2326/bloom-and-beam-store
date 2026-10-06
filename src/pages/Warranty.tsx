import { Layout } from '@/components/layout/Layout';
import { SEOHead } from '@/components/seo/SEOHead';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';

export default function Warranty() {
  return (
    <Layout>
      <BreadcrumbSchema items={[{ name: 'Warranty', path: '/warranty' }]} />
      <SEOHead title="Warranty Information | Mr.Bedmed" description="Warranty Information for Mr. Bed Med products — coverage, claims, and support details." />
      <div className="container py-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h1>Warranty Information for Mr. Bed Med Products</h1>
        <p>Mr. Bed Med provides high-quality hospital beds and biomedical equipment. This warranty ensures product reliability and support.</p>

        <h2>Standard Warranty</h2>
        <p>All products are covered for 12 months against defects in materials and workmanship unless specified otherwise.</p>

        <h2>Warranty Coverage</h2>
        <ul>
          <li>Repair or replacement of defective parts.</li>
          <li>Labor costs for authorized repairs.</li>
          <li>Technical support for product functionality issues.</li>
        </ul>

        <h2>Exclusions</h2>
        <ul>
          <li>Damage from misuse, accidents, or neglect.</li>
          <li>Unauthorized modifications or repairs.</li>
          <li>Normal wear and tear, consumables, or cosmetic issues.</li>
          <li>Use outside recommended conditions.</li>
        </ul>

        <h2>Claim Process</h2>
        <ol>
          <li>Contact support with proof of purchase and issue details.</li>
          <li>Our team assesses the problem and guides repair or replacement.</li>
          <li>Ship the product securely if required.</li>
          <li>We repair or replace the product within a reasonable timeframe.</li>
        </ol>

        <h2>Limitations</h2>
        <ul>
          <li>Warranty is non-transferable and valid for the original purchaser.</li>
          <li>Indirect, incidental, or consequential damages are not covered.</li>
        </ul>

        <h2>Extended Warranty</h2>
        <p>Optional extended plans may cover additional years or specific components. Details provided at purchase.</p>

        <h2>Maintenance</h2>
        <p>Follow instructions for cleaning, calibration, and preventive maintenance to ensure product longevity.</p>

        <h2>Technical Support</h2>
        <p>Our team provides assistance for troubleshooting, installation, and guidance.</p>

        <h2>Product-Specific Terms</h2>
        <p>Custom or specialized products may have different warranty terms. Contact us for details.</p>

        <h2>Contact for Warranty Assistance</h2>
        <p>
          Mr. Bed Med<br />
          555 N. 5th St, Suite 109 B, Garland, TX 75040<br />
          Phone: +1 469 767 8853<br />
          Email: service@mbmts.com
        </p>
      </div>
    </Layout>
  );
}
