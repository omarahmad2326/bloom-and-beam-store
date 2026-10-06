import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import AdminLayout from './AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import RichTextEditor from '@/components/admin/RichTextEditor';
import ListEditor, { cleanList } from '@/components/admin/ListEditor';
import FaqListEditor, { cleanFaqs } from '@/components/admin/FaqListEditor';
import SeoFields, { customSchemaError } from '@/components/admin/SeoFields';
import { Section, TitleField } from '@/components/admin/PageEditorParts';
import {
  CONTACT_SETTINGS_KEY, DEFAULT_CONTACT, extractMapEmbedUrl, isValidMapEmbed, withContactDefaults,
  type ContactPageContent,
} from '@/lib/contactPage';

export default function AdminContactPage() {
  const { isAdmin } = useAuth();
  const [content, setContent] = useState<ContactPageContent>(DEFAULT_CONTACT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<ContactPageContent>) => setContent((c) => ({ ...c, ...patch }));

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('site_settings').select('value').eq('key', CONTACT_SETTINGS_KEY).maybeSingle();
      if (error) toast.error('Failed to load the Contact page');
      setContent(withContactDefaults(data?.value));
      setLoading(false);
    })();
  }, []);

  const mapInvalid = !!content.map_embed_url.trim() && !isValidMapEmbed(content.map_embed_url);

  const save = async () => {
    if (!isAdmin) {
      toast.error('Admin privileges required');
      return;
    }
    if (!content.h1.trim()) {
      toast.error('The page heading (H1) is required');
      return;
    }
    if (mapInvalid) {
      toast.error('The map must be a Google Maps embed link');
      return;
    }
    const schemaError = customSchemaError(content.custom_schema);
    if (schemaError) {
      toast.error(`Custom schema: ${schemaError}`);
      return;
    }
    const clean: ContactPageContent = { ...content, cities: cleanList(content.cities), faqs: cleanFaqs(content.faqs) };
    setSaving(true);
    const { error } = await supabase
      .from('site_settings')
      .upsert([{ key: CONTACT_SETTINGS_KEY, value: clean as unknown as Json }], { onConflict: 'key' });
    setSaving(false);
    if (error) {
      toast.error('Failed to save the Contact page');
      return;
    }
    setContent(clean);
    toast.success('Contact page saved');
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
      </AdminLayout>
    );
  }

  const saveButton = (
    <Button onClick={save} disabled={saving || !isAdmin}>
      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
    </Button>
  );

  return (
    <AdminLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="sticky top-0 z-10 -mx-2 flex flex-wrap items-center justify-between gap-3 bg-muted/80 px-2 py-3 backdrop-blur">
          <div>
            <h1 className="text-3xl font-bold">Contact Page</h1>
            <p className="text-sm text-muted-foreground">Empty optional sections are hidden on the site.</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <a href="/contact-us" target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" /> View page</a>
            </Button>
            {saveButton}
          </div>
        </div>

        <Section n={1} title="Page heading">
          <TitleField id="h1" label="H1" value={content.h1} onChange={(h1) => set({ h1 })} />
          <div className="space-y-2">
            <Label htmlFor="intro">Intro line</Label>
            <Textarea id="intro" value={content.intro} onChange={(e) => set({ intro: e.target.value })} rows={2} />
          </div>
        </Section>

        <Section n={2} title="Contact details" hint="Phone, email, address and hours come from Contact Info, so they stay the same everywhere on the site.">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/contact-settings">Edit Contact Info</Link>
          </Button>
          <div className="space-y-2">
            <Label htmlFor="map_embed_url">Google Map (optional)</Label>
            <Textarea
              id="map_embed_url"
              value={content.map_embed_url}
              onChange={(e) => set({ map_embed_url: extractMapEmbedUrl(e.target.value) })}
              rows={2}
              placeholder="In Google Maps: Share → Embed a map → Copy HTML, then paste it here"
              className={mapInvalid ? 'border-destructive' : ''}
            />
            {mapInvalid && <p className="text-xs font-medium text-destructive">Paste the embed code from Google Maps (Share → Embed a map).</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="map_title">Map description (for screen readers)</Label>
            <Input id="map_title" value={content.map_title} onChange={(e) => set({ map_title: e.target.value })} />
          </div>
        </Section>

        <Section n={3} title="Contact form" hint="Messages arrive in Dashboard → Messages.">
          <TitleField id="form_title" label="Form title (H2)" value={content.form_title} onChange={(form_title) => set({ form_title })} />
          <div className="space-y-2">
            <Label htmlFor="form_intro">Text above the form (optional)</Label>
            <Textarea id="form_intro" value={content.form_intro} onChange={(e) => set({ form_intro: e.target.value })} rows={2} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TitleField id="form_button" label="Button text" value={content.form_button} onChange={(form_button) => set({ form_button })} />
            <TitleField id="success_message" label="Message shown after sending" value={content.success_message} onChange={(success_message) => set({ success_message })} />
          </div>
        </Section>

        <Section n={4} title="Service area (optional)">
          <TitleField id="areas_title" value={content.areas_title} onChange={(areas_title) => set({ areas_title })} />
          <RichTextEditor label="Text" value={content.areas_html} onChange={(areas_html) => set({ areas_html })} imageBucket="site-images" minHeight={100} />
          <ListEditor id="cities" label="Cities" items={content.cities} onChange={(cities) => set({ cities })} placeholder="e.g. Dallas" />
        </Section>

        <Section n={5} title="FAQs (optional)" hint="Shown as an accordion and added to Google structured data (FAQPage).">
          <TitleField id="faq_title" value={content.faq_title} onChange={(faq_title) => set({ faq_title })} />
          <FaqListEditor items={content.faqs} onChange={(faqs) => set({ faqs })} />
        </Section>

        <Section n={6} title="Additional content (optional)">
          <TitleField id="extra_title" value={content.extra_title} onChange={(extra_title) => set({ extra_title })} />
          <RichTextEditor label="Content" value={content.extra_html} onChange={(extra_html) => set({ extra_html })} imageBucket="site-images" minHeight={140} />
        </Section>

        <SeoFields
          values={content}
          onChange={set}
          path="/contact-us"
          fallbackTitle={DEFAULT_CONTACT.meta_title}
          fallbackDescription={DEFAULT_CONTACT.meta_description}
        />

        <div className="flex justify-end pb-8">{saveButton}</div>
      </div>
    </AdminLayout>
  );
}
