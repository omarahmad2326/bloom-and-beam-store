import { Layout } from '@/components/layout/Layout';
import { SEOHead } from '@/components/seo/SEOHead';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';

export default function Terms() {
  return (
    <Layout>
      <BreadcrumbSchema items={[{ name: 'Terms of Service', path: '/terms' }]} />
      <SEOHead title="Terms of Service | Mr.Bedmed" description="Terms of Service for Mr. Bed Med — governing your use of our website and services." />
      <div className="container py-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h1>Terms of Service for Mr. Bed Med</h1>
        <p>Welcome to https://mrbedmed.com/. These Terms of Service ("Terms") govern your use of our website and services. By using our website, you agree to these Terms.</p>

        <h2>Acceptance of Terms</h2>
        <p>Accessing or using our website means you accept these Terms. If you disagree, please do not use our website.</p>

        <h2>Services</h2>
        <p>Mr. Bed Med provides hospital beds, biomedical equipment, parts, accessories, and related services across Texas. We may modify or discontinue services at any time.</p>

        <h2>Account Registration</h2>
        <p>Some website features require registration. You must provide accurate information and keep your account secure. You are responsible for all activity under your account.</p>

        <h2>Orders and Payments</h2>
        <ul>
          <li>Orders are subject to availability.</li>
          <li>Prices may change without notice.</li>
          <li>Payments are securely processed via approved methods.</li>
          <li>Accurate billing information is required.</li>
        </ul>

        <h2>Shipping and Delivery</h2>
        <p>We aim for timely delivery. Delivery times may vary. Risk passes to the customer upon delivery.</p>

        <h2>Returns and Refunds</h2>
        <ul>
          <li>Products can be returned according to our Return Policy.</li>
          <li>Refunds are processed via the original payment method.</li>
          <li>Custom orders may not be returnable.</li>
        </ul>

        <h2>Website Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Violate laws or regulations.</li>
          <li>Engage in fraudulent activity.</li>
          <li>Interfere with website security or functionality.</li>
          <li>Post harmful content.</li>
        </ul>

        <h2>Intellectual Property</h2>
        <p>All website content, logos, and images belong to Mr. Bed Med and cannot be reproduced without permission.</p>

        <h2>Limitation of Liability</h2>
        <p>Mr. Bed Med is not liable for indirect, incidental, or consequential damages. Total liability is limited to the amount paid for the product or service.</p>

        <h2>Indemnification</h2>
        <p>You agree to defend and hold Mr. Bed Med harmless from claims arising from your violation of these Terms.</p>

        <h2>Governing Law</h2>
        <p>These Terms are governed by Texas law. Disputes are subject to Garland, TX courts.</p>

        <h2>Changes</h2>
        <p>Terms may be updated anytime. Continued use of the website constitutes acceptance of changes.</p>

        <h2>Contact Information</h2>
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
