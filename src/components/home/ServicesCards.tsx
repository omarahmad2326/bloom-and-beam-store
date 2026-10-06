import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queries } from '@/queries';
import { Link } from '@/lib/router';
import { Bed, Ambulance, Armchair, Stethoscope, HeartPulse, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ServiceItem {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
}

interface ServiceCard {
  id: string;
  title: string;
  icon: string;
  color: string;
  sort_order: number;
  items: ServiceItem[];
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Bed,
  Ambulance,
  Armchair,
  Stethoscope,
  HeartPulse,
  Activity,
};

const fallbackCategories = [
  {
    id: 'beds',
    title: 'Beds',
    icon: 'Bed',
    color: 'from-primary/20 to-primary/5',
    sort_order: 0,
    items: [
      { id: '1', name: 'Fully Electric Bed', slug: 'fully-electric-bed', sort_order: 0 },
      { id: '2', name: 'Semi Electric Bed', slug: 'semi-electric-bed', sort_order: 1 },
      { id: '3', name: 'Bariatric Bed', slug: 'bariatric-bed', sort_order: 2 },
      { id: '4', name: 'Burn Bed', slug: 'burn-bed', sort_order: 3 },
      { id: '5', name: 'Birthing Bed', slug: 'birthing-bed', sort_order: 4 },
    ],
  },
  {
    id: 'stretchers',
    title: 'Stretchers',
    icon: 'Ambulance',
    color: 'from-secondary/20 to-secondary/5',
    sort_order: 1,
    items: [
      { id: '6', name: 'EMS Stretcher', slug: 'ems-stretcher', sort_order: 0 },
      { id: '7', name: 'ER Stretcher', slug: 'er-stretcher', sort_order: 1 },
      { id: '8', name: 'Surgery Stretcher', slug: 'surgery-stretcher', sort_order: 2 },
      { id: '9', name: 'Bariatric Stretcher', slug: 'bariatric-stretcher', sort_order: 3 },
      { id: '10', name: 'EVAC Stretcher', slug: 'evac-stretcher', sort_order: 4 },
      { id: '11', name: 'Eye Surgery Stretcher', slug: 'eye-surgery-stretcher', sort_order: 5 },
      { id: '12', name: 'Birthing Stretcher', slug: 'birthing-stretcher', sort_order: 6 },
    ],
  },
  {
    id: 'accessories',
    title: 'Accessories',
    icon: 'Armchair',
    color: 'from-accent/40 to-accent/10',
    sort_order: 2,
    items: [
      { id: '13', name: 'Bed Side Table', slug: 'bedside-table', sort_order: 0 },
      { id: '14', name: 'Bed Over Table', slug: 'bed-over-table', sort_order: 1 },
      { id: '15', name: 'Wheel Chair', slug: 'wheelchair', sort_order: 2 },
      { id: '16', name: 'Patient Recliner', slug: 'patient-recliner', sort_order: 3 },
    ],
  },
];

export function ServicesCards() {
  const [activeCard, setActiveCard] = useState<string | null>(null);
  // Cards from Dashboard → Home Cards (shared with the header menu; prefetched on the server).
  const { data: menu } = useQuery(queries.homeMenu());
  const serviceCategories: ServiceCard[] = menu && menu.length > 0 ? menu : fallbackCategories;

  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold">
            Hospital Beds & Stretcher Solutions
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            Explore our comprehensive range of medical beds, stretchers, and accessories 
            designed for healthcare facilities.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {serviceCategories.map((category, index) => {
            const IconComponent = iconMap[category.icon] || Bed;
            return (
              <div
                key={category.id}
                className="relative opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'forwards' }}
                onMouseEnter={() => setActiveCard(category.id)}
                onMouseLeave={() => setActiveCard(null)}
              >
                <div
                  className={cn(
                    'bg-card rounded-2xl border p-8 text-center transition-all duration-300 cursor-pointer',
                    'hover:shadow-xl hover:-translate-y-2 hover:border-primary/50',
                    activeCard === category.id && 'border-primary shadow-xl -translate-y-2'
                  )}
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      'inline-flex items-center justify-center w-24 h-24 rounded-2xl mb-6',
                      'bg-gradient-to-br',
                      category.color,
                      'text-primary transition-transform duration-300',
                      activeCard === category.id && 'scale-110'
                    )}
                  >
                    <IconComponent className="h-12 w-12" />
                  </div>

                  {/* Title */}
                  <h3 className="font-display text-2xl font-bold mb-4">{category.title}</h3>

                  {/* Dropdown Items */}
                  <div
                    className={cn(
                      'transition-all duration-300 ease-out',
                      activeCard === category.id ? 'max-h-80 opacity-100 overflow-y-auto' : 'max-h-0 opacity-0 overflow-hidden'
                    )}
                  >
                    <div className="pt-4 border-t mt-4 space-y-2">
                      {category.items.map((item) => (
                        <Link
                          key={item.slug}
                          to={`/category/${item.slug}`}
                          className="block py-2 px-4 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors font-medium"
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Hint text when not hovered */}
                  <p
                    className={cn(
                      'text-muted-foreground text-sm mt-4 transition-opacity duration-300',
                      activeCard === category.id ? 'opacity-0' : 'opacity-100'
                    )}
                  >
                    Hover to explore options
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}