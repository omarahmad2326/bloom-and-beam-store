import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { 
  ClipboardCheck, 
  Wrench, 
  Gauge, 
  Calendar, 
  RefreshCw, 
  ShoppingCart, 
  Package, 
  Trash2, 
  FileText,
  Settings,
  Shield,
  Heart,
  LucideIcon
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  ClipboardCheck,
  Wrench,
  Gauge,
  Calendar,
  RefreshCw,
  ShoppingCart,
  Package,
  Trash2,
  FileText,
  Settings,
  Shield,
  Heart
};

interface Service {
  id: string;
  slug: string;
  icon: string;
  title: string;
  short_desc: string;
  sort_order: number;
}

const Services = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, slug, icon, title, short_desc, sort_order')
        .eq('published', true)
        .order('sort_order', { ascending: true });

      if (!error && data) {
        setServices(data);
      }
      setLoading(false);
    };

    fetchServices();
  }, []);

  if (loading) {
    return (
      <Layout>
        <BreadcrumbSchema items={[{ name: 'Services', path: '/services' }]} />
        <section className="py-16 md:py-24">
          <div className="container text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <BreadcrumbSchema items={[{ name: 'Services', path: '/services' }]} />
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-16">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Our Services</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Comprehensive biomedical equipment support and services for healthcare facilities.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, i) => {
              const IconComponent = iconMap[service.icon] || ClipboardCheck;
              return (
                <Link 
                  key={service.id}
                  to={`/services/${service.slug}`}
                  className="bg-card p-8 rounded-2xl border card-hover text-center opacity-0 animate-fade-in-up group" 
                  style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'forwards' }}
                >
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                    <IconComponent className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-display font-bold text-xl mb-3 group-hover:text-primary transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-muted-foreground">{service.short_desc}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-primary/5">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Need Professional Equipment Services?
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Get in touch with our team of experts for reliable biomedical equipment services tailored to your healthcare facility's needs.
            </p>
            <Button asChild size="lg" className="btn-shine">
              <Link to="/contact-us">Request a Service / Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Services;
