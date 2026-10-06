import { Layout } from '@/components/layout/Layout';
import { SEOHead } from '@/components/seo/SEOHead';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';

export default function Privacy() {
  return (
    <Layout>
      <BreadcrumbSchema items={[{ name: 'Privacy Policy', path: '/privacy' }]} />
      <SEOHead title="Privacy Policy | Mr.Bedmed" description="Privacy Policy for Mr. Bed Med — how we collect, use, and protect your personal information." />
      <div className="container py-16 max-w-3xl mx-auto prose prose-neutral dark:prose-invert">
        <h1>Privacy Policy for Mr. Bed Med</h1>
        <p>At Mr. Bed Med, your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your personal information when you visit our website or use our services. By using our website, you agree to this policy.</p>

        <h2>Information We Collect</h2>
        <ul>
          <li><strong>Personal Information:</strong> Name, email, phone number, billing/shipping address, or any information you provide during inquiries or purchases.</li>
          <li><strong>Usage Information:</strong> Pages visited, time spent, and interactions on our website.</li>
          <li><strong>Device Information:</strong> Browser type, IP address, operating system, and other technical details.</li>
          <li><strong>Payment Information:</strong> Details provided during secure transactions via our payment gateway.</li>
        </ul>

        <h2>How We Use Your Information</h2>
        <ul>
          <li>To process orders and provide services.</li>
          <li>To respond to inquiries and share updates or promotions.</li>
          <li>To improve website functionality and user experience.</li>
          <li>To prevent fraud and ensure security.</li>
          <li>To comply with legal obligations.</li>
        </ul>

        <h2>Sharing Your Information</h2>
        <p>We do not sell your information. Sharing may occur with:</p>
        <ul>
          <li><strong>Service Providers:</strong> For payments, delivery, and marketing support.</li>
          <li><strong>Legal Authorities:</strong> When required by law.</li>
          <li><strong>Business Transfers:</strong> During mergers or acquisitions, customer data may transfer.</li>
        </ul>

        <h2>Cookies and Tracking</h2>
        <p>Cookies enhance your browsing experience. They remember preferences, analyze trends, and personalize content. You can disable cookies, but some features may not work properly.</p>

        <h2>Data Security</h2>
        <p>We use encryption, secure servers, and access controls to protect your data. No method of online transmission is fully secure, so we cannot guarantee absolute protection.</p>

        <h2>Your Rights</h2>
        <p>You can access, correct, or delete your personal information. Opt out of marketing emails anytime via the unsubscribe link or by contacting us.</p>

        <h2>Children's Privacy</h2>
        <p>We do not knowingly collect data from children under 18. If discovered, such data will be deleted.</p>

        <h2>Policy Updates</h2>
        <p>Changes will be posted here with a revision date. Review regularly for updates.</p>

        <h2>Contact Us</h2>
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
