import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ShoppingCart, Phone, Search, User, LogOut, ChevronDown, Package, Settings } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { QuoteButton } from '@/components/QuoteButton';
import { Input } from '@/components/ui/input';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { telHref, FALLBACK_PHONE } from '@/components/CallButton';
import { useContactInfo } from '@/hooks/useContactInfo';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
}

interface HomeServiceCard {
  id: string;
  title: string;
}

interface HomeServiceCardItem {
  id: string;
  card_id: string;
  name: string;
  slug: string;
}

const aboutBedmedLinks = [
  { name: 'Blog', path: '/blog' },
  { name: 'FAQ', path: '/faq' },
  { name: 'About', path: '/about-us' },
  { name: 'Contact', path: '/contact-us' },
  { name: 'Home Health', path: 'https://www.mrbiomedtechservices.com/services', external: true },
];

export function Header() {
  const { contactInfo } = useContactInfo();
  const topBarPhone = contactInfo.phone?.trim() || FALLBACK_PHONE;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileHospitalBedsOpen, setIsMobileHospitalBedsOpen] = useState(false);
  const [isMobileStretchersOpen, setIsMobileStretchersOpen] = useState(false);
  const [isMobileAccessoriesOpen, setIsMobileAccessoriesOpen] = useState(false);
  const [isMobileAboutOpen, setIsMobileAboutOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { getItemCount, setIsCartOpen } = useCart();
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const itemCount = getItemCount();

  // State for database categories
  const [hospitalBedCategories, setHospitalBedCategories] = useState<CategoryItem[]>([]);
  const [stretcherCategories, setStretcherCategories] = useState<CategoryItem[]>([]);
  const [accessoryCategories, setAccessoryCategories] = useState<CategoryItem[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      // Fetch home service cards and their items
      const { data: cards } = await supabase
        .from('home_service_cards')
        .select('*')
        .order('sort_order', { ascending: true });

      const { data: items } = await supabase
        .from('home_service_card_items')
        .select('*')
        .order('sort_order', { ascending: true });

      if (cards && items) {
        // Find cards by title
        const bedsCard = cards.find(c => c.title.toLowerCase().includes('bed'));
        const stretchersCard = cards.find(c => c.title.toLowerCase().includes('stretcher'));
        const accessoriesCard = cards.find(c => c.title.toLowerCase().includes('accessor'));

        if (bedsCard) {
          setHospitalBedCategories(items.filter(i => i.card_id === bedsCard.id));
        }
        if (stretchersCard) {
          setStretcherCategories(items.filter(i => i.card_id === stretchersCard.id));
        }
        if (accessoriesCard) {
          setAccessoryCategories(items.filter(i => i.card_id === accessoriesCard.id));
        }
      }
    };

    fetchCategories();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setIsSearchOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Top Bar */}
      <div className="bg-primary text-primary-foreground py-2">
        <div className="container flex justify-between items-center text-sm">
          <a href={telHref(topBarPhone)} className="flex items-center gap-2 hover:underline underline-offset-2">
            <Phone className="h-4 w-4" aria-hidden="true" />
            <span>Call Us: {topBarPhone}</span>
          </a>
          <div className="hidden md:block">
            <span>Free Shipping on Orders Over $1,000</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="glass border-b">
        <div className="container flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center transition-transform group-hover:scale-110">
            <span className="text-primary-foreground font-display font-bold text-xl">M</span>
            </div>
            <span className="font-display font-bold text-2xl text-foreground">
              Mr.<span className="text-primary">Bedmed</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            <Link
              to="/"
              className={cn(
                'relative font-medium transition-colors hover:text-primary',
                'after:absolute after:left-0 after:bottom-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all after:duration-300 hover:after:w-full',
                location.pathname === '/' && 'text-primary after:w-full'
              )}
            >
              Home
            </Link>

            {/* Hospital Beds Dropdown */}
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger 
                    className={cn(
                      'bg-transparent hover:bg-transparent focus:bg-transparent data-[state=open]:bg-transparent',
                      'font-medium transition-colors hover:text-primary px-0',
                      location.pathname.startsWith('/category/') && 'text-primary'
                    )}
                  >
                    Hospital Beds
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="w-[220px] p-3 bg-card border rounded-lg shadow-lg">
                      <div className="space-y-1">
                        {hospitalBedCategories.map((category) => (
                          <NavigationMenuLink key={category.id} asChild>
                            <Link
                              to={`/category/${category.slug}`}
                              className="block py-2 px-3 rounded-lg hover:bg-accent transition-colors text-sm font-medium hover:text-primary"
                            >
                              {category.name}
                            </Link>
                          </NavigationMenuLink>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <NavigationMenuLink asChild>
                          <Link
                            to="/products?type=hospital-beds"
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            View All Products →
                          </Link>
                        </NavigationMenuLink>
                      </div>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>

            {/* Stretchers Dropdown */}
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger 
                    className={cn(
                      'bg-transparent hover:bg-transparent focus:bg-transparent data-[state=open]:bg-transparent',
                      'font-medium transition-colors hover:text-primary px-0'
                    )}
                  >
                    Stretchers
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="w-[220px] p-3 bg-card border rounded-lg shadow-lg">
                      <div className="space-y-1">
                        {stretcherCategories.map((category) => (
                          <NavigationMenuLink key={category.id} asChild>
                            <Link
                              to={`/category/${category.slug}`}
                              className="block py-2 px-3 rounded-lg hover:bg-accent transition-colors text-sm font-medium hover:text-primary"
                            >
                              {category.name}
                            </Link>
                          </NavigationMenuLink>
                        ))}
                      </div>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>

            {/* Accessories Dropdown */}
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger 
                    className={cn(
                      'bg-transparent hover:bg-transparent focus:bg-transparent data-[state=open]:bg-transparent',
                      'font-medium transition-colors hover:text-primary px-0'
                    )}
                  >
                    Accessories
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="w-[220px] p-3 bg-card border rounded-lg shadow-lg">
                      <div className="space-y-1">
                        {accessoryCategories.map((category) => (
                          <NavigationMenuLink key={category.id} asChild>
                            <Link
                              to={`/category/${category.slug}`}
                              className="block py-2 px-3 rounded-lg hover:bg-accent transition-colors text-sm font-medium hover:text-primary"
                            >
                              {category.name}
                            </Link>
                          </NavigationMenuLink>
                        ))}
                      </div>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>

            {/* Parts Link */}
            <Link
              to="/parts"
              className={cn(
                'relative font-medium transition-colors hover:text-primary',
                'after:absolute after:left-0 after:bottom-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all after:duration-300 hover:after:w-full',
                location.pathname === '/parts' && 'text-primary after:w-full'
              )}
            >
              Parts
            </Link>

            {/* Services Link */}
            <Link
              to="/services"
              className={cn(
                'relative font-medium transition-colors hover:text-primary',
                'after:absolute after:left-0 after:bottom-0 after:h-0.5 after:w-0 after:bg-primary after:transition-all after:duration-300 hover:after:w-full',
                location.pathname.startsWith('/services') && 'text-primary after:w-full'
              )}
            >
              Services
            </Link>


            {/* About Bedmed Dropdown */}
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger 
                    className={cn(
                      'bg-transparent hover:bg-transparent focus:bg-transparent data-[state=open]:bg-transparent',
                      'font-medium transition-colors hover:text-primary px-0'
                    )}
                  >
                    About Mr.Bedmed
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="w-[180px] p-3 bg-card border rounded-lg shadow-lg">
                      <div className="space-y-1">
                        {aboutBedmedLinks.map((link) => (
                          <NavigationMenuLink key={link.path} asChild>
                            {'external' in link && link.external ? (
                              <a
                                href={link.path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block py-2 px-3 rounded-lg hover:bg-accent transition-colors text-sm font-medium hover:text-primary"
                              >
                                {link.name}
                              </a>
                            ) : (
                              <Link
                                to={link.path}
                                className="block py-2 px-3 rounded-lg hover:bg-accent transition-colors text-sm font-medium hover:text-primary"
                              >
                                {link.name}
                              </Link>
                            )}
                          </NavigationMenuLink>
                        ))}
                      </div>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="hidden md:flex">
                  <Search className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-2" align="end">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1"
                    autoFocus
                  />
                  <Button type="submit" size="sm">
                    Search
                  </Button>
                </form>
              </PopoverContent>
            </Popover>
            
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-secondary text-secondary-foreground text-xs font-bold rounded-full flex items-center justify-center animate-scale-in">
                  {itemCount}
                </span>
              )}
            </Button>

            {/* Admin/User Actions */}
            {user ? (
              <div className="hidden md:flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                          {user.user_metadata?.full_name
                            ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                            : user.email?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <div className="px-2 py-1.5 text-sm font-medium truncate">
                      {user.user_metadata?.full_name || user.email}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/account" className="cursor-pointer">
                        <Settings className="h-4 w-4 mr-2" />
                        Account Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/orders" className="cursor-pointer">
                        <Package className="h-4 w-4 mr-2" />
                        Order History
                      </Link>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/admin" className="cursor-pointer">
                            <User className="h-4 w-4 mr-2" />
                            Admin Dashboard
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Button asChild variant="ghost" size="sm" className="hidden md:flex">
                <Link to="/auth">
                  <User className="h-4 w-4 mr-2" />
                  Login
                </Link>
              </Button>
            )}

            <QuoteButton to="/contact-us" className="hidden lg:flex" showArrow={false}>
              Get Quote
            </QuoteButton>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="lg:hidden border-t bg-card animate-fade-in">
            <div className="container py-4 flex flex-col gap-2">
              <Link
                to="/"
                onClick={() => setIsMenuOpen(false)}
                className={cn(
                  'py-3 px-4 rounded-lg font-medium transition-colors hover:bg-accent',
                  'animate-fade-in-up',
                  location.pathname === '/' && 'bg-accent text-primary'
                )}
              >
                Home
              </Link>

              {/* Mobile Hospital Beds Accordion */}
              <div className="animate-fade-in-up" style={{ animationDelay: '50ms' }}>
                <button
                  onClick={() => setIsMobileHospitalBedsOpen(!isMobileHospitalBedsOpen)}
                  className={cn(
                    'w-full py-3 px-4 rounded-lg font-medium transition-colors hover:bg-accent flex items-center justify-between'
                  )}
                >
                  Hospital Beds
                  <ChevronDown className={cn('h-4 w-4 transition-transform', isMobileHospitalBedsOpen && 'rotate-180')} />
                </button>
                {isMobileHospitalBedsOpen && (
                  <div className="ml-4 mt-2 space-y-1 max-h-60 overflow-y-auto">
                    {hospitalBedCategories.map((category) => (
                      <Link
                        key={category.id}
                        to={`/category/${category.slug}`}
                        onClick={() => { setIsMenuOpen(false); setIsMobileHospitalBedsOpen(false); }}
                        className="block py-2 px-4 text-sm rounded-lg hover:bg-accent transition-colors"
                      >
                        {category.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Mobile Stretchers Accordion */}
              <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <button
                  onClick={() => setIsMobileStretchersOpen(!isMobileStretchersOpen)}
                  className="w-full py-3 px-4 rounded-lg font-medium transition-colors hover:bg-accent flex items-center justify-between"
                >
                  Stretchers
                  <ChevronDown className={cn('h-4 w-4 transition-transform', isMobileStretchersOpen && 'rotate-180')} />
                </button>
                {isMobileStretchersOpen && (
                  <div className="ml-4 mt-2 space-y-1">
                    {stretcherCategories.map((category) => (
                      <Link
                        key={category.id}
                        to={`/category/${category.slug}`}
                        onClick={() => { setIsMenuOpen(false); setIsMobileStretchersOpen(false); }}
                        className="block py-2 px-4 text-sm rounded-lg hover:bg-accent transition-colors"
                      >
                        {category.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Mobile Accessories Accordion */}
              <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
                <button
                  onClick={() => setIsMobileAccessoriesOpen(!isMobileAccessoriesOpen)}
                  className="w-full py-3 px-4 rounded-lg font-medium transition-colors hover:bg-accent flex items-center justify-between"
                >
                  Accessories
                  <ChevronDown className={cn('h-4 w-4 transition-transform', isMobileAccessoriesOpen && 'rotate-180')} />
                </button>
                {isMobileAccessoriesOpen && (
                  <div className="ml-4 mt-2 space-y-1">
                    {accessoryCategories.map((category) => (
                      <Link
                        key={category.id}
                        to={`/category/${category.slug}`}
                        onClick={() => { setIsMenuOpen(false); setIsMobileAccessoriesOpen(false); }}
                        className="block py-2 px-4 text-sm rounded-lg hover:bg-accent transition-colors"
                      >
                        {category.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Parts Link */}
              <Link
                to="/parts"
                onClick={() => setIsMenuOpen(false)}
                className={cn(
                  'py-3 px-4 rounded-lg font-medium transition-colors hover:bg-accent',
                  'animate-fade-in-up',
                  location.pathname === '/parts' && 'bg-accent text-primary'
                )}
                style={{ animationDelay: '200ms' }}
              >
                Parts
              </Link>

              {/* Services Link */}
              <Link
                to="/services"
                onClick={() => setIsMenuOpen(false)}
                className={cn(
                  'py-3 px-4 rounded-lg font-medium transition-colors hover:bg-accent',
                  'animate-fade-in-up',
                  location.pathname.startsWith('/services') && 'bg-accent text-primary'
                )}
                style={{ animationDelay: '225ms' }}
              >
                Services
              </Link>




              {/* Mobile About Mr.Bedmed Accordion */}
              <div className="animate-fade-in-up" style={{ animationDelay: '250ms' }}>
                <button
                  onClick={() => setIsMobileAboutOpen(!isMobileAboutOpen)}
                  className="w-full py-3 px-4 rounded-lg font-medium transition-colors hover:bg-accent flex items-center justify-between"
                >
                  About Mr.Bedmed
                  <ChevronDown className={cn('h-4 w-4 transition-transform', isMobileAboutOpen && 'rotate-180')} />
                </button>
                {isMobileAboutOpen && (
                  <div className="ml-4 mt-2 space-y-1">
                    {aboutBedmedLinks.map((link) => (
                      'external' in link && link.external ? (
                        <a
                          key={link.path}
                          href={link.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => { setIsMenuOpen(false); setIsMobileAboutOpen(false); }}
                          className="block py-2 px-4 text-sm rounded-lg hover:bg-accent transition-colors"
                        >
                          {link.name}
                        </a>
                      ) : (
                        <Link
                          key={link.path}
                          to={link.path}
                          onClick={() => { setIsMenuOpen(false); setIsMobileAboutOpen(false); }}
                          className="block py-2 px-4 text-sm rounded-lg hover:bg-accent transition-colors"
                        >
                          {link.name}
                        </Link>
                      )
                    ))}
                  </div>
                )}
              </div>
              {user ? (
                <>
                  <Link
                    to="/account"
                    onClick={() => setIsMenuOpen(false)}
                    className="py-3 px-4 rounded-lg font-medium transition-colors hover:bg-accent flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Account Settings
                  </Link>
                  <Link
                    to="/orders"
                    onClick={() => setIsMenuOpen(false)}
                    className="py-3 px-4 rounded-lg font-medium transition-colors hover:bg-accent flex items-center gap-2"
                  >
                    <Package className="h-4 w-4" />
                    Order History
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setIsMenuOpen(false)}
                      className="py-3 px-4 rounded-lg font-medium transition-colors hover:bg-accent flex items-center gap-2"
                    >
                      <User className="h-4 w-4" />
                      Admin Dashboard
                    </Link>
                  )}
                  <Button variant="outline" onClick={() => { signOut(); setIsMenuOpen(false); }} className="mt-2">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <Button asChild variant="outline" className="mt-2">
                  <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                    <User className="h-4 w-4 mr-2" />
                    Login
                  </Link>
                </Button>
              )}
              <QuoteButton
                to="/contact-us"
                className="mt-2"
                showArrow={false}
                onClick={() => setIsMenuOpen(false)}
              >
                Get Quote
              </QuoteButton>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
