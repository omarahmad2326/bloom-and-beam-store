import { Phone, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuoteButton } from '@/components/QuoteButton';
import { telHref, FALLBACK_PHONE } from '@/components/CallButton';
import { useContactInfo } from '@/hooks/useContactInfo';

export function CTA() {
  const { contactInfo } = useContactInfo();
  const phone = contactInfo.phone?.trim() || FALLBACK_PHONE;
  return (
    <section className="py-20">
      <div className="container">
        <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/70 text-primary-foreground p-8 md:p-16 transition-all duration-700 hover:shadow-[0_30px_80px_-20px_hsl(var(--primary)/0.6)]">
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-secondary/0 via-secondary/20 to-secondary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

          {/* Shine sweep — loops continuously, revealed on hover */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-cta-shine" />
          </div>

          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10 transition-opacity duration-700 group-hover:opacity-20">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
              backgroundSize: '30px 30px'
            }} />
          </div>

          {/* Floating orbs — animate forever, fade in on hover */}
          <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-secondary/30 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-cta-float-1" />
          <div className="pointer-events-none absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-white/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 animate-cta-float-2" />

          {/* Sparkles — animate forever, fade in on hover */}
          <Sparkles className="pointer-events-none absolute top-8 right-12 h-5 w-5 text-white/60 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-cta-sparkle" />
          <Sparkles className="pointer-events-none absolute bottom-10 right-1/3 h-4 w-4 text-secondary opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-cta-sparkle [animation-delay:0.7s]" />
          <Sparkles className="pointer-events-none absolute top-16 left-20 h-3 w-3 text-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-cta-sparkle [animation-delay:1.3s]" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="text-center lg:text-left transition-transform duration-500 group-hover:translate-x-1">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
                Ready to Upgrade Your Medical Equipment?
              </h2>
              <p className="text-primary-foreground/80 text-lg max-w-xl">
                Get a personalized quote for your healthcare facility.
                Our team is ready to help you find the perfect solutions.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <QuoteButton to="/contact-us" variant="secondary" size="lg" className="text-base">
                Get a Quote
              </QuoteButton>
              <Button
                size="lg"
                variant="outline"
                className="relative overflow-hidden bg-primary-foreground/10 border-primary-foreground/60 text-primary-foreground hover:bg-primary-foreground hover:text-primary text-base transition-all duration-300 hover:scale-105 hover:animate-btn-bob"
                asChild
              >
                <a href={telHref(phone)} className="group/btn relative">
                  <span className="btn-shine-sweep" />
                  <span className="relative z-10 inline-flex items-center">
                    <Phone className="mr-2 h-5 w-5 transition-transform duration-500 group-hover/btn:rotate-12" />
                    Call {phone}
                  </span>
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
