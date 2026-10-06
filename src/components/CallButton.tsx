import { Phone } from 'lucide-react';
import { useContactInfo } from '@/hooks/useContactInfo';
import { cn } from '@/lib/utils';

export const FALLBACK_PHONE = '+1 469 767 8853';

/** "+1 469 767 8853" → "tel:+14697678853" */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

interface CallButtonProps {
  /**
   * onDark: white button with brand-blue text, swaps to white outline on hover (for blue boxes).
   * onLight: brand-blue outline, fills blue on hover (for white/light boxes).
   */
  tone?: 'onDark' | 'onLight';
  size?: 'default' | 'lg';
  /** Defaults to "Call {phone}". */
  label?: string;
  className?: string;
}

/** Click-to-call button using the phone number from Dashboard → Contact Info. */
export function CallButton({ tone = 'onDark', size = 'lg', label, className }: CallButtonProps) {
  const { contactInfo } = useContactInfo();
  const phone = contactInfo.phone?.trim() || FALLBACK_PHONE;

  return (
    <a
      href={telHref(phone)}
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border-2 font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        size === 'lg' ? 'h-11 px-8 text-base' : 'h-10 px-4 text-sm',
        tone === 'onDark'
          ? 'border-white bg-white text-primary hover:bg-transparent hover:text-white focus-visible:ring-white focus-visible:ring-offset-primary'
          : 'border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground focus-visible:ring-primary',
        className,
      )}
    >
      <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
      {label ?? `Call ${phone}`}
    </a>
  );
}
