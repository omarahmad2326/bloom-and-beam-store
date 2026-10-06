'use client';

import { useState, useMemo } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from '@/lib/router';
import { ChevronLeft, ChevronRight, Search, ShoppingCart, Filter } from 'lucide-react';
import { SEOHead } from '@/components/seo/SEOHead';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/hooks/use-toast';
import { toPlainText } from '@/lib/content';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { resolveAlt } from '@/lib/imageAlt';
import { absoluteUrl } from '@/lib/site';
import { queries } from '@/queries';
import { useQuery } from '@tanstack/react-query';

interface Part {
  id: string;
  name: string;
  description: string | null;
  short_description: string | null;
  image_alts: (string | null)[] | null;
  price: number;
  category: string;
  image_urls: string[];
  in_stock: boolean;
  make: string | null;
  model: string | null;
  sku: string | null;
  slug: string | null;
}

const PartImageCarousel = ({ images, name, alts }: { images: string[]; name: string; alts?: (string | null)[] | null }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-sm">
        No image available
      </div>
    );
  }

  const prev = () => setCurrentIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  const next = () => setCurrentIndex((i) => (i === images.length - 1 ? 0 : i + 1));

  return (
    <div className="relative w-full h-48 group">
      <img
        src={images[currentIndex]}
        alt={resolveAlt(alts?.[currentIndex], name)}
        className="w-full h-48 object-contain rounded-lg bg-white"
      />
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/90 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/90 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${i === currentIndex ? 'bg-primary' : 'bg-muted-foreground/50'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const Parts = () => {
  const { data: parts = [], isLoading: loading } = useQuery(queries.parts());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMake, setSelectedMake] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { addToCart } = useCart();
  const { toast } = useToast();


  const filteredParts = useMemo(() => {
    let result = parts as Part[];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (part) =>
          part.name.toLowerCase().includes(query) ||
          part.description?.toLowerCase().includes(query) ||
          part.make?.toLowerCase().includes(query) ||
          part.model?.toLowerCase().includes(query) ||
          part.sku?.toLowerCase().includes(query)
      );
    }

    // Filter by make
    if (selectedMake !== 'all') {
      result = result.filter((part) => part.make === selectedMake);
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter((part) => part.category === selectedCategory);
    }

    return result;
  }, [searchQuery, selectedMake, selectedCategory, parts]);

  const makes = [...new Set(parts.map((p) => p.make).filter(Boolean))] as string[];
  const categories = [...new Set(parts.map((p) => p.category))];

  const handleAddToCart = (part: Part) => {
    addToCart(
      {
        id: part.id,
        name: part.name,
        price: part.price,
        image: part.image_urls?.[0] || '',
        description: part.short_description || toPlainText(part.description, 200),
        category: part.category,
        features: [],
        inStock: part.in_stock,
        rating: 4.5,
        reviews: 0,
      },
      1
    );
    toast({ title: 'Added to cart', description: `${part.name} added.` });
  };

  return (
    <Layout>
      <BreadcrumbSchema items={[{ name: 'Parts', path: '/parts' }]} />
      <SEOHead
        title="Spare Parts - OEM Replacement Parts | Mr.Bedmed"
        description="OEM replacement parts for all Mr.Bedmed medical equipment. Search by manufacturer, model, or part number."
        canonicalUrl={absoluteUrl('/parts')}
      />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-12">
        <div className="container">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">Shop by Device</h1>
          <p className="text-primary-foreground/80 max-w-2xl">
            Find OEM replacement parts for your medical equipment. Search by manufacturer, model, or part number.
          </p>
        </div>
      </section>

      {/* Search & Filter Section */}
      <section className="bg-card border-b sticky top-[80px] z-40">
        <div className="container py-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search Keyword or Item Number"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>

            {/* Manufacturer Filter */}
            <Select value={selectedMake} onValueChange={setSelectedMake}>
              <SelectTrigger className="w-full md:w-48 h-12">
                <SelectValue placeholder="Manufacturer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Manufacturers</SelectItem>
                {makes.map((make) => (
                  <SelectItem key={make} value={make}>
                    {make}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Model/Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48 h-12">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button className="h-12 px-8 btn-shine">
              <Filter className="mr-2 h-4 w-4" />
              Find
            </Button>
          </div>
        </div>
      </section>

      {/* Parts Grid */}
      <section className="py-12">
        <div className="container">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
              <p className="mt-4 text-muted-foreground">Loading parts...</p>
            </div>
          ) : filteredParts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">No parts found matching your criteria.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedMake('all');
                  setSelectedCategory('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <p className="text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{filteredParts.length}</span> parts
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredParts.map((part, i) => (
                  <div
                    key={part.id}
                    className="bg-card rounded-xl border overflow-hidden card-hover opacity-0 animate-fade-in-up"
                    style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'forwards' }}
                  >
                    {/* Image */}
                    <Link to={`/part/${part.slug || part.id}`}>
                      <PartImageCarousel images={part.image_urls} name={part.name} alts={part.image_alts} />
                    </Link>

                    {/* Content */}
                    <div className="p-4 space-y-3">
                      {/* Make & Model */}
                      {(part.make || part.model) && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {part.make && <span className="bg-muted px-2 py-0.5 rounded">{part.make}</span>}
                          {part.model && <span className="bg-muted px-2 py-0.5 rounded">{part.model}</span>}
                        </div>
                      )}

                      {/* SKU */}
                      {part.sku && (
                        <p className="text-xs text-muted-foreground">SKU: {part.sku}</p>
                      )}

                      {/* Name */}
                      <Link to={`/part/${part.slug || part.id}`}>
                        <h3 className="font-display font-bold text-lg hover:text-primary transition-colors line-clamp-2">
                          {part.name}
                        </h3>
                      </Link>

                      {/* Description */}
                      {(part.short_description || part.description) && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{part.short_description || toPlainText(part.description, 160)}</p>
                      )}

                      {/* Price & Stock */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div>
                          <p className="text-xl font-bold text-primary">{'$' + part.price.toFixed(2)}</p>
                          <span
                            className={`text-xs font-medium ${
                              part.in_stock ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {part.in_stock ? 'In Stock' : 'Out of Stock'}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          className="btn-shine"
                          disabled={!part.in_stock}
                          onClick={() => handleAddToCart(part)}
                        >
                          <ShoppingCart className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="text-center mt-12">
            <Button asChild variant="outline" size="lg">
              <Link to="/contact-us">Request Custom Part</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Parts;