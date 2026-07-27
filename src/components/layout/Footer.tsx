import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useContactInfo } from '@/hooks/useContactInfo';

export function Footer() {
  const { contactInfo } = useContactInfo();

  const socialIcons = [
    { Icon: Facebook, url: contactInfo.social_links.facebook },
    { Icon: Twitter, url: contactInfo.social_links.twitter },
    { Icon: Linkedin, url: contactInfo.social_links.linkedin },
    { Icon: Instagram, url: contactInfo.social_links.instagram },
  ];

  return (
    <footer className="bg-foreground text-background">
      {/* Newsletter Section */}
      <div className="border-b border-background/10">
        <div className="container py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-display text-2xl font-bold mb-2">Stay Updated</h3>
              <p className="text-background/70">Get the latest news on medical equipment innovations</p>
            </div>
            <div className="flex w-full md:w-auto gap-3">
              <Input
                type="email"
                placeholder="Enter your email"
                className="bg-background/10 border-background/20 text-background placeholder:text-background/50 w-full md:w-64"
              />
              <Button className="btn-shine bg-secondary hover:bg-secondary/90">
                Subscribe
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Company Info */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-xl">M</span>
              </div>
              <span className="font-display font-bold text-2xl">
                Mr.<span className="text-primary">Bedmed</span>
              </span>
            </Link>
            <p className="text-background/70 mb-6">
              Leading provider of premium medical stretchers and hospital equipment. 
              Trusted by healthcare facilities worldwide since 1995.
            </p>
            <div className="flex gap-4">
              {socialIcons.map(({ Icon, url }, i) => (
                <a
                  key={i}
                  href={url || '#'}
                  target={url ? '_blank' : undefined}
                  rel={url ? 'noopener noreferrer' : undefined}
                  className="w-10 h-10 bg-background/10 rounded-full flex items-center justify-center hover:bg-primary transition-colors"
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-bold text-lg mb-6">Quick Links</h4>
            <ul className="space-y-3">
              {[
                { name: 'Products', to: '/products' },
                { name: 'Services', to: '/services' },
                { name: 'Parts', to: '/parts' },
                { name: 'FAQ', to: '/faq' },
                { name: 'About Us', to: '/about-us' },
                { name: 'Contact', to: '/contact-us' },
              ].map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.to}
                    className="text-background/70 hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Products */}
          <div>
            <h4 className="font-display font-bold text-lg mb-6">Products</h4>
            <ul className="space-y-3">
              {[
                { name: 'ER Stretchers', to: '/category/er-stretcher' },
                { name: 'EMS Stretcher', to: '/category/ems-stretcher' },
                { name: 'ICU Beds', to: '/category/ICU-bed' },
                { name: 'Patients Recliner', to: '/category/patient-recliner' },
                { name: 'Spare Parts', to: '/parts' },
              ].map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.to}
                    className="text-background/70 hover:text-primary transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-bold text-lg mb-6">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <span className="text-background/70">
                  {contactInfo.address_line1}<br />
                  {contactInfo.address_line2}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-primary" />
                <span className="text-background/70">{contactInfo.phone}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <span className="text-background/70">{contactInfo.email}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Important Notice */}
      <div className="border-t border-background/10">
        <div className="container py-6">
          <div className="flex items-start md:items-center justify-center gap-3 rounded-lg border border-warning/30 bg-warning/10 px-5 py-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-warning mt-0.5 md:mt-0" />
            <p className="text-warning text-sm md:text-base text-left md:text-center">
              <span className="font-semibold">Important Notice:</span>{' '}
              Our contact details may appear on invoices not issued by us. Please verify all invoices directly with our team before making any payment. We accept no liability for payments made against invoices not issued or authorized by us.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-background/10">
        <div className="container py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-background/50 text-sm">
            © {new Date().getFullYear()} Mr.Bedmed. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-background/50">
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
            <Link to="/warranty" className="hover:text-primary transition-colors">Warranty Info</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
