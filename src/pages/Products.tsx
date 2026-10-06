import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { ProductCard } from '@/components/products/ProductCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SEOHead } from '@/components/seo/SEOHead';
import { toPlainText } from '@/lib/content';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { absoluteUrl } from '@/lib/site';

interface Product {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  short_description: string | null;
  image_alt: string | null;
  price: number;
  original_price: number | null;
  image_url: string | null;
  category: string;
  features: string[] | null;
  in_stock: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

// Hospital bed category names to filter by when type=hospital-beds
const hospitalBedCategories = [
  'Fully Electric Bed',
  'Semi Electric Beds',
  'Bariatric Bed',
  'Low Bed',
  'ICU Bed',
  'Pediatric Bed',
  'Trendelenburg Bed',
  'Adjustable Height Bed',
  'Home Care Bed',
  'Long Term Care Bed',
  'Med-Surg Bed',
  'Birthing Bed',
  'Stretchers'
];

const Products = () => {
  const [searchParams] = useSearchParams();
  const isHospitalBedsFilter = searchParams.get('type') === 'hospital-beds';
  const searchQuery = searchParams.get('search') || '';
  
  const [activeCategory, setActiveCategory] = useState('All');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch categories
      const { data: catData } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      // Fetch products
      const { data: prodData } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (catData) setCategories(catData);
      if (prodData) setProducts(prodData);
      setLoading(false);
    };

    fetchData();
  }, []);

  // Filter products based on hospital beds type if specified
  let baseProducts = isHospitalBedsFilter
    ? products.filter(p => hospitalBedCategories.includes(p.category))
    : products;

  // Apply search filter if search query exists
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    baseProducts = baseProducts.filter(p => 
      p.name.toLowerCase().includes(query) || 
      (p.description && p.description.toLowerCase().includes(query)) ||
      p.category.toLowerCase().includes(query)
    );
  }

  // Get categories for the filtered products
  const productCategories = [...new Set(baseProducts.map(p => p.category))];
  const combinedCategories = ['All', ...new Set([...categories.map(c => c.name).filter(name => 
    !isHospitalBedsFilter || hospitalBedCategories.includes(name)
  ), ...productCategories])];

  const filteredProducts = activeCategory === 'All' 
    ? baseProducts 
    : baseProducts.filter(p => p.category === activeCategory);

  const scrollSlider = (direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const scrollAmount = 200;
      sliderRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <Layout>
      <BreadcrumbSchema items={[{ name: 'Products', path: '/products' }]} />
      <SEOHead
        title={isHospitalBedsFilter 
          ? "Hospital Beds & Medical Beds | Mr.Bedmed Products" 
          : "Medical Equipment & Hospital Stretchers | Mr.Bedmed Products"}
        description={isHospitalBedsFilter
          ? "Browse our complete range of hospital beds including electric, ICU, bariatric, and home care beds."
          : "Explore our complete range of premium medical stretchers and hospital equipment. Emergency, ICU, transport, and recovery stretchers."}
        canonicalUrl={absoluteUrl('/products')}
      />

      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              {searchQuery 
                ? `Search Results for "${searchQuery}"` 
                : isHospitalBedsFilter 
                  ? 'Hospital Beds' 
                  : 'Our Products'}
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {searchQuery
                ? `Found ${baseProducts.length} product${baseProducts.length !== 1 ? 's' : ''} matching your search.`
                : isHospitalBedsFilter 
                  ? 'Browse our complete range of hospital beds for every medical need.'
                  : 'Explore our complete range of premium medical stretchers and hospital equipment.'}
            </p>
          </div>

          {/* Category Slider */}
          <div className="relative mb-12">
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 shadow-md"
              onClick={() => scrollSlider('left')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div
              ref={sliderRef}
              className="flex gap-3 overflow-x-auto scrollbar-hide px-10 py-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {combinedCategories.map(cat => (
                <Button
                  key={cat}
                  variant={activeCategory === cat ? 'default' : 'outline'}
                  onClick={() => setActiveCategory(cat)}
                  className={cn('btn-shine whitespace-nowrap flex-shrink-0', activeCategory === cat && 'shadow-lg')}
                >
                  {cat}
                </Button>
              ))}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 shadow-md"
              onClick={() => scrollSlider('right')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No products found in this category.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product, index) => (
                <ProductCard 
                  key={product.id} 
                  product={{
                    id: product.id,
                    slug: product.slug || undefined,
                    name: product.name,
                    description: product.short_description || toPlainText(product.description, 200),
                    price: product.price,
                    originalPrice: product.original_price || undefined,
                    image: product.image_url || '/placeholder.svg',
                    imageAlt: product.image_url ? product.image_alt : null,
                    category: product.category,
                    features: product.features || [],
                    inStock: product.in_stock,
                    rating: 4.5,
                    reviews: 0
                  }} 
                  index={index} 
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Products;
