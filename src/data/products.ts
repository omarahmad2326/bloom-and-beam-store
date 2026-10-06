import stretcherOrange from '@/assets/products/stretcher-orange.png';
import stretcherRed from '@/assets/products/stretcher-red.png';
import stretcherBurgundy from '@/assets/products/stretcher-burgundy.png';
import stretcherBlackRed from '@/assets/products/stretcher-black-red.png';
import stretcherBlue from '@/assets/products/stretcher-blue.png';
import stretcherGray from '@/assets/products/stretcher-gray.png';
import stretcherYellow from '@/assets/products/stretcher-yellow.png';

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

export const products: Product[] = [
  {
    id: 'stretcher-orange-001',
    name: 'ProCare Hospital Stretcher',
    description: 'Premium hospital stretcher with ergonomic design and high-visibility orange mattress. Features adjustable height, side rails, and smooth-rolling casters for easy maneuverability.',
    price: 2499,
    originalPrice: 2899,
    image: stretcherOrange,
    category: 'Emergency',
    features: [
      'Height adjustable: 24" to 36"',
      'Weight capacity: 500 lbs',
      'Locking swivel casters',
      'Foldable side rails',
      'Antimicrobial mattress'
    ],
    inStock: true,
    rating: 4.8,
    reviews: 124,
    isBestseller: true
  },
  {
    id: 'stretcher-red-002',
    name: 'ChromeElite Transport Gurney',
    description: 'Professional-grade transport gurney with chrome frame and vibrant red cushioning. Designed for hospital corridors and inter-facility transfers.',
    price: 2799,
    image: stretcherRed,
    category: 'Transport',
    features: [
      'Chrome-plated steel frame',
      'High-density foam mattress',
      '4-point restraint system',
      'IV pole mount compatible',
      'Easy-clean surfaces'
    ],
    inStock: true,
    rating: 4.7,
    reviews: 89,
    isNew: true
  },
  {
    id: 'stretcher-burgundy-003',
    name: 'FlexiCare Adjustable Stretcher',
    description: 'Versatile adjustable stretcher with burgundy upholstery. Multiple position settings for patient comfort during extended procedures and recovery.',
    price: 3299,
    originalPrice: 3699,
    image: stretcherBurgundy,
    category: 'Procedure',
    features: [
      'Multi-position backrest',
      'Trendelenburg capable',
      'Removable headrest',
      'Central locking system',
      'Push-handle height adjustment'
    ],
    inStock: true,
    rating: 4.9,
    reviews: 156
  },
  {
    id: 'stretcher-black-red-004',
    name: 'ICU Premium Care Bed',
    description: 'Advanced ICU-grade stretcher with integrated IV pole and monitoring equipment mounts. Features premium black and red design with maximum functionality.',
    price: 4599,
    image: stretcherBlackRed,
    category: 'ICU',
    features: [
      'Integrated IV pole',
      'Monitor mounting brackets',
      'Electric height adjustment',
      'CPR quick-release',
      'Under-bed storage',
      'Ventilator shelf'
    ],
    inStock: true,
    rating: 4.9,
    reviews: 78,
    isBestseller: true
  },
  {
    id: 'stretcher-blue-005',
    name: 'ClassicCare Bronze Frame Stretcher',
    description: 'Elegant bronze-finished frame with calming blue mattress. Perfect for patient rooms and recovery areas requiring a welcoming aesthetic.',
    price: 2199,
    image: stretcherBlue,
    category: 'Recovery',
    features: [
      'Bronze powder-coated frame',
      'Memory foam mattress',
      'Quiet-roll casters',
      'Easy side-rail operation',
      'Stain-resistant fabric'
    ],
    inStock: true,
    rating: 4.6,
    reviews: 201
  },
  {
    id: 'stretcher-gray-006',
    name: 'Heritage Medical Stretcher',
    description: 'Classic design medical stretcher with neutral gray upholstery. Reliable performance for general hospital use and patient transport.',
    price: 1899,
    originalPrice: 2199,
    image: stretcherGray,
    category: 'General',
    features: [
      'Durable steel construction',
      'Standard side rails',
      'O2 tank holder',
      'Drainage bag hooks',
      'Easy maintenance'
    ],
    inStock: true,
    rating: 4.5,
    reviews: 312
  },
  {
    id: 'stretcher-yellow-007',
    name: 'EmergencyFirst Rescue Stretcher',
    description: 'High-visibility yellow emergency stretcher designed for rapid response. Lightweight yet durable construction for field operations and ambulance use.',
    price: 3499,
    image: stretcherYellow,
    category: 'Emergency',
    features: [
      'Lightweight aluminum frame',
      'High-visibility coloring',
      'Quick-fold mechanism',
      'All-terrain wheels',
      'Weatherproof materials',
      'Ambulance mount compatible'
    ],
    inStock: true,
    rating: 4.8,
    reviews: 167,
    isNew: true
  }
];

export const categories = [
  'All',
  'Emergency',
  'Transport',
  'Procedure',
  'ICU',
  'Recovery',
  'General'
];
