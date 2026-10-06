import { Layout } from '@/components/layout/Layout';
import { Award, Users, Target, Heart } from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';

const About = () => (
  <Layout>
    <BreadcrumbSchema items={[{ name: 'About Us', path: '/about-us' }]} />
    <section className="py-16 md:py-24">
      <div className="container">
        <div className="text-center mb-16">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">About Mr.Bedmed</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">Leading provider of premium medical equipment since 1995.</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
          <div className="space-y-6">
            <h2 className="font-display text-3xl font-bold">Our Mission</h2>
            <p className="text-muted-foreground text-lg">We're committed to improving patient care through innovative, reliable medical equipment. Every stretcher we build represents our dedication to healthcare excellence.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Award, value: '25+', label: 'Years Experience' },
              { icon: Users, value: '500+', label: 'Healthcare Partners' },
              { icon: Target, value: '10K+', label: 'Units Delivered' },
              { icon: Heart, value: '98%', label: 'Satisfaction Rate' },
            ].map((stat, i) => (
              <div key={i} className="bg-card p-6 rounded-xl border text-center card-hover">
                <stat.icon className="h-8 w-8 text-primary mx-auto mb-3" />
                <div className="font-display font-bold text-2xl text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  </Layout>
);

export default About;
