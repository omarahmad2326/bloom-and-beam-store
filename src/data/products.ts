/** Cart / product-card model (the old sample product list was removed; products come from Supabase). */
export interface Product {
  id: string;
  slug?: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  /** ALT text from the dashboard ('' = decorative); falls back to name. */
  imageAlt?: string | null;
  category: string;
  features: string[];
  inStock: boolean;
  rating: number;
  reviews: number;
  isNew?: boolean;
  isBestseller?: boolean;
}
