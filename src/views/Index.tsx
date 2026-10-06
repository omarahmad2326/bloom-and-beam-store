'use client';

import { Layout } from '@/components/layout/Layout';
import { Hero } from '@/components/home/Hero';
import { PartnerSlider } from '@/components/home/PartnerSlider';
import { ServicesCards } from '@/components/home/ServicesCards';
import { FeaturedProducts } from '@/components/home/FeaturedProducts';
import { ValueProps } from '@/components/home/ValueProps';
import { Testimonials } from '@/components/home/Testimonials';
import { CTA } from '@/components/home/CTA';

const Index = () => {
  return (
    <Layout>
      <Hero />
      <PartnerSlider />
      <ServicesCards />
      <FeaturedProducts />
      <ValueProps />
      <Testimonials />
      <CTA />
    </Layout>
  );
};

export default Index;
