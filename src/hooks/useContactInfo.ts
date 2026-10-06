import { useQuery } from '@tanstack/react-query';
import { queries } from '@/queries';
import { defaultContactInfo } from '@/lib/contactInfo';

export { defaultContactInfo, postalAddressOf, type ContactInfo } from '@/lib/contactInfo';

/** Contact details from Dashboard → Contact Info (prefetched on the server for every page). */
export function useContactInfo() {
  const { data, isLoading } = useQuery(queries.contactInfo());
  return { contactInfo: data ?? defaultContactInfo, loading: isLoading };
}
