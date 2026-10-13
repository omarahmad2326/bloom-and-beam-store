/** Server-side reads for Dashboard → SEO & Tracking (fresh per request, so saves go live at once). */
import { cache } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_SEO_SETTINGS, SEO_SETTINGS_KEY, withSeoDefaults, type SeoSettings } from '@/lib/seoSettings';

/** One read per request; if the database cannot be reached the site keeps its previous defaults. */
export const getSeoSettings = cache(async (): Promise<SeoSettings> => {
  const { data, error } = await supabase.from('site_settings').select('value').eq('key', SEO_SETTINGS_KEY).maybeSingle();
  if (error) {
    console.error('[seo] could not read settings:', error.message);
    return DEFAULT_SEO_SETTINGS;
  }
  return withSeoDefaults(data?.value);
});
