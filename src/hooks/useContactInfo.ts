import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { defaultContactInfo, type ContactInfo } from '@/lib/contactInfo';

export { defaultContactInfo, postalAddressOf, type ContactInfo } from '@/lib/contactInfo';

export function useContactInfo() {
  const [contactInfo, setContactInfo] = useState<ContactInfo>(defaultContactInfo);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'contact_info')
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        if (data?.value) {
          setContactInfo({ ...defaultContactInfo, ...(data.value as unknown as ContactInfo) });
        }
      } catch (error) {
        console.error('Error fetching contact info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContactInfo();
  }, []);

  return { contactInfo, loading };
}
