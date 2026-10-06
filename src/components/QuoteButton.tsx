import { Link } from '@/lib/router';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuoteButtonProps {
  to?: string;
  onClick?: () => void;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
  showArrow?: boolean;
  external?: boolean;
}

export function QuoteButton({
  to = '/contact-us',
  onClick,
  variant = 'default',
  size = 'lg',
  className,
  children = 'Get a Quote',
  showArrow = true,
  external = false,
}: QuoteButtonProps) {
  const content = (
    <>
      <span className="btn-shine-sweep" />
      <span className="relative z-10 inline-flex items-center">
        {children}
        {showArrow && (
          <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover/btn:translate-x-1.5" />
        )}
      </span>
    </>
  );

  return (
    <Button
      asChild
      size={size}
      variant={variant}
      className={cn(
        'relative overflow-hidden transition-all duration-300 hover:scale-105 hover:animate-btn-pulse-glow',
        className
      )}
    >
      {external ? (
        <a
          href={to}
          onClick={onClick}
          className="group/btn relative inline-flex items-center justify-center"
        >
          {content}
        </a>
      ) : (
        <Link
          to={to}
          onClick={onClick}
          className="group/btn relative inline-flex items-center justify-center"
        >
          {content}
        </Link>
      )}
    </Button>
  );
}
