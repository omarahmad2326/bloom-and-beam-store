import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { QuoteButton } from '@/components/QuoteButton';
import { ArrowRight, Shield, CheckCircle, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import heroHospitalBed from '@/assets/products/hero-hospital-bed.png';
import { resolveAlt } from '@/lib/imageAlt';

interface HeroSettings {
  badge: string;
  title_line1: string;
  title_line2: string;
  title_line3: string;
  description: string;
  hero_image_url: string;
  hero_image_alt?: string | null;
  stats: { value: string; label: string }[];
  trust_badges: { icon: string; text: string }[];
}

const defaultHeroSettings: HeroSettings = {
  badge: 'Trusted by 500+ Healthcare Facilities',
  title_line1: 'Hospital Beds &',
  title_line2: 'Stretcher Solutions',
  title_line3: 'Modern Healthcare',
  description: 'Industry-leading hospital stretchers and transport equipment. Engineered for patient comfort, built for healthcare professionals.',
  hero_image_url: '',
  stats: [
    { value: '25+', label: 'Years Experience' },
    { value: '10K+', label: 'Units Sold' },
    { value: '98%', label: 'Satisfaction' }
  ],
  trust_badges: [
    { icon: 'CheckCircle', text: '5-Year Warranty' },
    { icon: 'Truck', text: 'Free Shipping' },
    { icon: 'Shield', text: 'FDA Approved' }
  ]
};

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  CheckCircle,
  Truck,
  Shield
};

export function Hero() {
  const [settings, setSettings] = useState<HeroSettings>(defaultHeroSettings);

  useEffect(() => {
    const fetchHeroSettings = async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'hero')
        .maybeSingle();

      if (!error && data?.value) {
        setSettings(data.value as unknown as HeroSettings);
      }
    };

    fetchHeroSettings();
  }, []);

  const heroImage = settings.hero_image_url || heroHospitalBed;

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background via-accent/30 to-background">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="container relative py-16 md:py-24 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-2 text-sm font-medium animate-fade-in">
              <Shield className="h-4 w-4" />
              {settings.badge}
            </div>

            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-tight animate-fade-in-up">
              {settings.title_line1}
              <br />
              <span className="text-gradient">{settings.title_line2}</span> for
              <br />
              {settings.title_line3}
            </h1>

            <p className="text-lg text-muted-foreground max-w-lg opacity-0 animate-fade-in-up animation-delay-200" style={{ animationFillMode: 'forwards' }}>
              {settings.description}
            </p>

            <div className="flex flex-wrap gap-4 opacity-0 animate-fade-in-up animation-delay-300" style={{ animationFillMode: 'forwards' }}>
              <Button asChild size="lg" className="btn-shine text-base">
                <Link to="/products">
                  Explore Products
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <QuoteButton to="/contact-us" variant="outline" size="lg" className="text-base" showArrow={false}>
                Request Quote
              </QuoteButton>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t opacity-0 animate-fade-in-up animation-delay-400" style={{ animationFillMode: 'forwards' }}>
              {settings.trust_badges.map((badge, i) => {
                const IconComponent = iconMap[badge.icon] || Shield;
                return (
                  <div key={i} className="flex flex-col items-center text-center gap-2">
                    <IconComponent className="h-6 w-6 text-primary" />
                    <span className="text-sm font-medium">{badge.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Image */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent" />
            <img
              src={heroImage}
              alt={settings.hero_image_url ? resolveAlt(settings.hero_image_alt, 'Hospital stretcher from Mrbedmed') : 'Hospital stretcher from Mrbedmed'}
              className="w-full animate-float drop-shadow-2xl"
            />
            {/* Floating Stats */}
            <div className="absolute -bottom-4 left-0 right-0 flex justify-center gap-4">
              {settings.stats.map((stat, i) => (
                <div
                  key={i}
                  className="bg-card rounded-xl px-5 py-3 shadow-lg border animate-scale-in"
                  style={{ animationDelay: `${500 + i * 100}ms`, animationFillMode: 'forwards' }}
                >
                  <div className="font-display font-bold text-xl text-primary">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
