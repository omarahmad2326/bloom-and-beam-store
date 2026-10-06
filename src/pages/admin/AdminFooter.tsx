import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Loader2, Plus, RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';
import AdminLayout from './AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import ImageUpload from '@/components/admin/ImageUpload';
import { moveItem, RowControls, Section, TitleField } from '@/components/admin/PageEditorParts';
import {
  DEFAULT_FOOTER, FOOTER_SETTINGS_KEY, isValidFooterUrl, renderCopyright, withFooterDefaults,
  type FooterColumn, type FooterContent, type FooterLink,
} from '@/lib/footer';

const STATIC_PAGES: FooterLink[] = [
  { label: 'Home', url: '/' },
  { label: 'Products', url: '/products' },
  { label: 'Services', url: '/services' },
  { label: 'Parts', url: '/parts' },
  { label: 'Blog', url: '/blog' },
  { label: 'FAQ', url: '/faq' },
  { label: 'About Us', url: '/about-us' },
  { label: 'Contact', url: '/contact-us' },
];

function Toggle({ id, checked, onChange, label }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}

function ColumnsEditor({ columns, onChange }: { columns: FooterColumn[]; onChange: (c: FooterColumn[]) => void }) {
  const updateColumn = (i: number, patch: Partial<FooterColumn>) =>
    onChange(columns.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const updateLink = (ci: number, li: number, patch: Partial<FooterLink>) =>
    updateColumn(ci, { links: columns[ci].links.map((l, idx) => (idx === li ? { ...l, ...patch } : l)) });

  return (
    <div className="space-y-4">
      {columns.map((column, ci) => (
        <div key={ci} className="space-y-3 rounded-lg border p-4">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor={`col-${ci}`}>Column title</Label>
              <Input id={`col-${ci}`} value={column.title} onChange={(e) => updateColumn(ci, { title: e.target.value })} placeholder="e.g. Quick Links" />
            </div>
            <RowControls index={ci} count={columns.length} label={`column ${column.title || ci + 1}`} onMove={(d) => onChange(moveItem(columns, ci, d))} onRemove={() => onChange(columns.filter((_, idx) => idx !== ci))} />
          </div>
          <div className="space-y-2">
            {column.links.map((link, li) => {
              const invalid = !!link.url.trim() && !isValidFooterUrl(link.url);
              return (
                <div key={li} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Input value={link.label} onChange={(e) => updateLink(ci, li, { label: e.target.value })} placeholder="Link text" aria-label="Link text" className="w-2/5" />
                    <Input
                      value={link.url}
                      onChange={(e) => updateLink(ci, li, { url: e.target.value })}
                      placeholder="/products or https://…"
                      aria-label="Link URL"
                      list="footer-link-targets"
                      className={invalid ? 'border-destructive' : ''}
                      aria-invalid={invalid}
                    />
                    <RowControls index={li} count={column.links.length} label={`link ${link.label || li + 1}`} onMove={(d) => updateColumn(ci, { links: moveItem(column.links, li, d) })} onRemove={() => updateColumn(ci, { links: column.links.filter((_, idx) => idx !== li) })} />
                  </div>
                  {invalid && <p className="text-xs text-destructive">Use a site path (/products), a full URL (https://…), mailto: or tel:.</p>}
                </div>
              );
            })}
            <Button type="button" variant="outline" size="sm" onClick={() => updateColumn(ci, { links: [...column.links, { label: '', url: '' }] })}>
              <Plus className="mr-1 h-4 w-4" /> Add link
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => onChange([...columns, { title: '', links: [] }])} disabled={columns.length >= 4}>
        <Plus className="mr-1 h-4 w-4" /> Add column
      </Button>
      {columns.length >= 4 && <p className="text-xs text-muted-foreground">Up to 4 link columns fit the layout.</p>}
    </div>
  );
}

export default function AdminFooter() {
  const { isAdmin } = useAuth();
  const [content, setContent] = useState<FooterContent>(DEFAULT_FOOTER);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<FooterContent>) => setContent((c) => ({ ...c, ...patch }));

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('site_settings').select('value').eq('key', FOOTER_SETTINGS_KEY).maybeSingle();
      if (error) toast.error('Failed to load the footer');
      setContent(withFooterDefaults(data?.value));
      setLoading(false);
    })();
  }, []);

  // Suggestions for link URLs: main pages, categories, services and content pages.
  const { data: targets = STATIC_PAGES } = useQuery({
    queryKey: ['footer-link-targets'],
    queryFn: async () => {
      const [cats, services, pages] = await Promise.all([
        supabase.from('categories').select('name, slug').order('sort_order'),
        supabase.from('services').select('title, slug').eq('published', true).order('sort_order'),
        supabase.from('site_pages').select('title, slug'),
      ]);
      return [
        ...STATIC_PAGES,
        ...(cats.data || []).map((c) => ({ label: c.name, url: `/category/${c.slug}` })),
        ...(services.data || []).map((s) => ({ label: s.title, url: `/services/${s.slug}` })),
        ...(pages.data || []).map((p) => ({ label: p.title, url: `/${p.slug}` })),
      ];
    },
  });

  const invalidLinks = useMemo(
    () => content.columns.flatMap((c) => c.links).filter((l) => (l.label.trim() || l.url.trim()) && !isValidFooterUrl(l.url)).length,
    [content.columns],
  );

  const save = async () => {
    if (!isAdmin) {
      toast.error('Admin privileges required');
      return;
    }
    if (invalidLinks > 0) {
      toast.error(`Fix ${invalidLinks} link URL${invalidLinks > 1 ? 's' : ''} before saving`);
      return;
    }
    const clean: FooterContent = {
      ...content,
      columns: content.columns
        .map((c) => ({ title: c.title.trim(), links: c.links.filter((l) => l.label.trim() && l.url.trim()).map((l) => ({ label: l.label.trim(), url: l.url.trim() })) }))
        .filter((c) => c.title || c.links.length),
    };
    setSaving(true);
    const { error } = await supabase
      .from('site_settings')
      .upsert([{ key: FOOTER_SETTINGS_KEY, value: clean as unknown as Json }], { onConflict: 'key' });
    setSaving(false);
    if (error) {
      toast.error('Failed to save the footer');
      return;
    }
    setContent(clean);
    toast.success('Footer saved');
  };

  const resetDefaults = () => {
    if (confirm('Replace all footer content with the original defaults? This only takes effect when you click Save.')) {
      setContent(DEFAULT_FOOTER);
    }
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
      <datalist id="footer-link-targets">
        {targets.map((t) => <option key={t.url} value={t.url}>{t.label}</option>)}
      </datalist>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="sticky top-0 z-10 -mx-2 flex flex-wrap items-center justify-between gap-3 bg-muted/80 px-2 py-3 backdrop-blur">
          <div>
            <h1 className="text-3xl font-bold">Footer</h1>
            <p className="text-sm text-muted-foreground">Shown at the bottom of every page.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={resetDefaults}><RotateCcw className="mr-2 h-4 w-4" /> Defaults</Button>
            <Button asChild variant="outline">
              <a href="/" target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" /> View site</a>
            </Button>
            {saveButton}
          </div>
        </div>

        <Section n={1} title="Newsletter strip" hint="Sign-ups arrive in Dashboard → Messages.">
          <Toggle id="newsletter_enabled" checked={content.newsletter_enabled} onChange={(newsletter_enabled) => set({ newsletter_enabled })} label="Show newsletter sign-up" />
          {content.newsletter_enabled && (
            <>
              <TitleField id="newsletter_title" label="Title" value={content.newsletter_title} onChange={(newsletter_title) => set({ newsletter_title })} />
              <TitleField id="newsletter_text" label="Text" value={content.newsletter_text} onChange={(newsletter_text) => set({ newsletter_text })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <TitleField id="newsletter_placeholder" label="Email box placeholder" value={content.newsletter_placeholder} onChange={(newsletter_placeholder) => set({ newsletter_placeholder })} />
                <TitleField id="newsletter_button" label="Button text" value={content.newsletter_button} onChange={(newsletter_button) => set({ newsletter_button })} />
              </div>
              <TitleField id="newsletter_success" label="Message after subscribing" value={content.newsletter_success} onChange={(newsletter_success) => set({ newsletter_success })} />
            </>
          )}
        </Section>

        <Section n={2} title="Brand">
          <div className="grid gap-4 sm:grid-cols-2">
            <TitleField id="brand_name_start" label="Name (first part)" value={content.brand_name_start} onChange={(brand_name_start) => set({ brand_name_start })} />
            <TitleField id="brand_name_highlight" label="Name (highlighted part)" value={content.brand_name_highlight} onChange={(brand_name_highlight) => set({ brand_name_highlight })} />
          </div>
          <ImageUpload
            bucket="site-images"
            currentUrl={content.logo_url}
            onImageChange={(logo_url) => set({ logo_url })}
            alt={content.logo_alt}
            onAltChange={(logo_alt) => set({ logo_alt })}
            label="Logo image (optional; replaces the letter badge)"
          />
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={content.description} onChange={(e) => set({ description: e.target.value })} rows={3} />
          </div>
          <Toggle id="show_social" checked={content.show_social} onChange={(show_social) => set({ show_social })} label="Show social media icons" />
          <p className="text-xs text-muted-foreground">
            Social links are set in <Link to="/admin/contact-settings" className="text-primary hover:underline">Contact Info</Link>; icons without a link are hidden.
          </p>
        </Section>

        <Section n={3} title="Link columns" hint="Start typing a URL to pick a page on this site.">
          <ColumnsEditor columns={content.columns} onChange={(columns) => set({ columns })} />
        </Section>

        <Section n={4} title="Contact column" hint="Address, phone and email come from Contact Info.">
          <Toggle id="contact_enabled" checked={content.contact_enabled} onChange={(contact_enabled) => set({ contact_enabled })} label="Show contact column" />
          {content.contact_enabled && (
            <TitleField id="contact_title" label="Column title" value={content.contact_title} onChange={(contact_title) => set({ contact_title })} />
          )}
          <Button asChild variant="outline" size="sm"><Link to="/admin/contact-settings">Edit Contact Info</Link></Button>
        </Section>

        <Section n={5} title="Important notice">
          <Toggle id="notice_enabled" checked={content.notice_enabled} onChange={(notice_enabled) => set({ notice_enabled })} label="Show notice" />
          {content.notice_enabled && (
            <>
              <TitleField id="notice_title" label="Lead-in (bold)" value={content.notice_title} onChange={(notice_title) => set({ notice_title })} />
              <div className="space-y-2">
                <Label htmlFor="notice_text">Text</Label>
                <Textarea id="notice_text" value={content.notice_text} onChange={(e) => set({ notice_text: e.target.value })} rows={3} />
              </div>
            </>
          )}
        </Section>

        <Section n={6} title="Bottom bar">
          <div className="space-y-2">
            <Label htmlFor="copyright">Copyright text</Label>
            <Input id="copyright" value={content.copyright} onChange={(e) => set({ copyright: e.target.value })} />
            <p className="text-xs text-muted-foreground">
              {'{year}'} is replaced with the current year. Preview: {renderCopyright(content.copyright)}
            </p>
          </div>
          <Toggle id="show_legal_links" checked={content.show_legal_links} onChange={(show_legal_links) => set({ show_legal_links })} label="Show legal page links" />
          <p className="text-xs text-muted-foreground">
            Which pages appear (and their order) is set in <Link to="/admin/pages" className="text-primary hover:underline">Pages</Link> → "Show in footer".
          </p>
        </Section>

        <div className="flex justify-end pb-8">{saveButton}</div>
      </div>
    </AdminLayout>
  );
}
