import { useEffect, useState } from 'react';
import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import AdminLayout from './AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import RichTextEditor from '@/components/admin/RichTextEditor';
import SlugField, { validateSlugForSave, slugErrorFromDb } from '@/components/admin/SlugField';
import SeoFields, { customSchemaError } from '@/components/admin/SeoFields';
import { slugify } from '@/lib/slugify';
import { isContentEmpty, toPlainText } from '@/lib/content';
import { altForSave, countImagesMissingAlt, isAltMissing, missingAltMessage, resolveAlt } from '@/lib/imageAlt';

type SitePage = Tables<'site_pages'>;

const emptyForm = {
  title: '',
  slug: '',
  content_html: '',
  published: true,
  show_in_footer: true,
  footer_label: '',
  footer_order: 0,
  meta_title: '',
  meta_description: '',
  custom_schema: '',
};

export default function AdminPages() {
  const { isAdmin } = useAuth();
  const [pages, setPages] = useState<SitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SitePage | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const set = (patch: Partial<typeof emptyForm>) => setFormData((f) => ({ ...f, ...patch }));

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    const { data, error } = await supabase
      .from('site_pages')
      .select('*')
      .order('footer_order', { ascending: true })
      .order('title', { ascending: true });
    if (error) toast.error('Failed to load pages');
    else setPages(data || []);
    setLoading(false);
  };

  const resetForm = () => {
    const nextOrder = pages.reduce((max, p) => Math.max(max, p.footer_order), 0) + 1;
    setFormData({ ...emptyForm, footer_order: nextOrder });
    setEditing(null);
    setSlugError(null);
  };

  const handleEdit = (page: SitePage) => {
    setEditing(page);
    setSlugError(null);
    setFormData({
      title: page.title,
      slug: page.slug,
      content_html: page.content_html,
      published: page.published,
      show_in_footer: page.show_in_footer,
      footer_label: page.footer_label || '',
      footer_order: page.footer_order,
      meta_title: page.meta_title || '',
      meta_description: page.meta_description || '',
      custom_schema: page.custom_schema || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Admin privileges required');
      return;
    }
    if (isContentEmpty(formData.content_html)) {
      toast.error('Page content is required');
      return;
    }
    if (formData.published && countImagesMissingAlt(formData.content_html) > 0) {
      toast.error(missingAltMessage(countImagesMissingAlt(formData.content_html)));
      return;
    }
    const schemaError = customSchemaError(formData.custom_schema);
    if (schemaError) {
      toast.error(`Custom schema: ${schemaError}`);
      return;
    }

    const slug = slugify(formData.slug);
    setSaving(true);
    const slugProblem = await validateSlugForSave('site_pages', slug, { excludeId: editing?.id, originalSlug: editing?.slug });
    if (slugProblem) {
      setSlugError(slugProblem);
      toast.error(slugProblem);
      setSaving(false);
      return;
    }

    const pageData = {
      title: formData.title.trim(),
      slug,
      content_html: formData.content_html,
      published: formData.published,
      show_in_footer: formData.show_in_footer,
      footer_label: formData.footer_label.trim() || null,
      footer_order: formData.footer_order,
      meta_title: formData.meta_title.trim() || null,
      meta_description: formData.meta_description.trim() || null,
      custom_schema: formData.custom_schema.trim() || null,
    };

    const { error } = editing
      ? await supabase.from('site_pages').update(pageData).eq('id', editing.id)
      : await supabase.from('site_pages').insert([pageData]);
    setSaving(false);

    if (error) {
      const slugMsg = slugErrorFromDb(error);
      if (slugMsg) setSlugError(slugMsg);
      toast.error(slugMsg || `Failed to ${editing ? 'update' : 'create'} page`);
      return;
    }
    toast.success(editing ? 'Page updated' : 'Page created');
    fetchPages();
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (page: SitePage) => {
    if (!isAdmin) return;
    if (!confirm(`Delete "${page.title}"? /${page.slug} will show "page not found" unless you add a redirect in Dashboard → Redirects.`)) return;
    const { error } = await supabase.from('site_pages').delete().eq('id', page.id);
    if (error) toast.error('Failed to delete page');
    else {
      toast.success('Page deleted');
      fetchPages();
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Pages</h1>
            <p className="text-muted-foreground">Legal and other content pages. Pages marked "Footer" are linked at the bottom of every page.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button disabled={!isAdmin} onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" /> New Page
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? 'Edit Page' : 'New Page'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Page title (H1)</Label>
                  <Input id="title" value={formData.title} onChange={(e) => set({ title: e.target.value })} required placeholder="e.g. Return Policy" />
                </div>

                <SlugField
                  table="site_pages"
                  value={formData.slug}
                  onChange={(slug) => { set({ slug }); setSlugError(null); }}
                  title={formData.title}
                  autoFill={!editing}
                  excludeId={editing?.id}
                  originalSlug={editing?.slug}
                  isPublished={editing?.published ?? false}
                  error={slugError}
                />

                <RichTextEditor
                  label="Content"
                  value={formData.content_html}
                  onChange={(content_html) => set({ content_html })}
                  imageBucket="site-images"
                  imageFileBase={formData.slug || slugify(formData.title)}
                  minHeight={320}
                />

                <div className="flex items-center gap-2">
                  <Switch id="published" checked={formData.published} onCheckedChange={(published) => set({ published })} />
                  <Label htmlFor="published">Published</Label>
                </div>

                <fieldset className="space-y-4 rounded-lg border p-4">
                  <legend className="px-1 text-sm font-semibold">Footer link</legend>
                  <div className="flex items-center gap-2">
                    <Switch id="show_in_footer" checked={formData.show_in_footer} onCheckedChange={(show_in_footer) => set({ show_in_footer })} />
                    <Label htmlFor="show_in_footer">Show in footer</Label>
                  </div>
                  {formData.show_in_footer && (
                    <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
                      <div className="space-y-2">
                        <Label htmlFor="footer_label">Link text</Label>
                        <Input id="footer_label" value={formData.footer_label} onChange={(e) => set({ footer_label: e.target.value })} placeholder={formData.title || 'Defaults to the page title'} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="footer_order">Order</Label>
                        <Input id="footer_order" type="number" value={formData.footer_order} onChange={(e) => set({ footer_order: parseInt(e.target.value) || 0 })} />
                      </div>
                    </div>
                  )}
                  {!formData.published && formData.show_in_footer && (
                    <p className="text-xs text-amber-700">Drafts are never shown in the footer.</p>
                  )}
                </fieldset>

                <SeoFields
                  values={formData}
                  onChange={set}
                  path={`/${formData.slug}`}
                  fallbackTitle={formData.title ? `${formData.title} | Mr.Bedmed` : ''}
                  fallbackDescription={toPlainText(formData.content_html, 160)}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
                  <Button type="submit" disabled={saving}>{saving ? 'Saving…' : editing ? 'Update Page' : 'Create Page'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="py-8 text-center">Loading...</div>
        ) : pages.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No pages yet. Create your first page.</CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {pages.map((page) => (
              <Card key={page.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">{page.title}</h3>
                    <a href={`/${page.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
                      /{page.slug} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {page.show_in_footer && page.published && (
                      <Badge variant="outline">Footer #{page.footer_order}: {page.footer_label || page.title}</Badge>
                    )}
                    <Badge variant={page.published ? 'secondary' : 'outline'} className={page.published ? 'bg-green-100 text-green-700' : 'text-amber-700'}>
                      {page.published ? 'Published' : 'Draft'}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(page)} disabled={!isAdmin} aria-label={`Edit ${page.title}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(page)} disabled={!isAdmin} aria-label={`Delete ${page.title}`}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
