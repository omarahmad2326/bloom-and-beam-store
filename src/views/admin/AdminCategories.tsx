'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ExternalLink } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import ImageUpload from '@/components/admin/ImageUpload';
import RichTextEditor from '@/components/admin/RichTextEditor';
import SlugField, { validateSlugForSave, slugErrorFromDb } from '@/components/admin/SlugField';
import SeoFields, { customSchemaError } from '@/components/admin/SeoFields';
import ListEditor, { cleanList } from '@/components/admin/ListEditor';
import FaqListEditor, { cleanFaqs, type FaqItem } from '@/components/admin/FaqListEditor';
import { slugify } from '@/lib/slugify';
import { toPlainText } from '@/lib/content';
import type { Tables } from '@/integrations/supabase/types';
import { altForSave, countImagesMissingAlt, isAltMissing, missingAltMessage, resolveAlt } from '@/lib/imageAlt';

type Category = Tables<'categories'>;

const emptyForm = {
  name: '',
  slug: '',
  description: '',
  image_url: '',
  image_alt: null as string | null,
  sort_order: 0,
  intro_html: '',
  why_choose: [] as string[],
  key_features: [] as string[],
  benefits: [] as string[],
  ideal_for: [] as string[],
  faqs: [] as FaqItem[],
  cta_title: '',
  cta_text: '',
  meta_title: '',
  meta_description: '',
  custom_schema: '',
};

const asFaqs = (value: unknown): FaqItem[] =>
  Array.isArray(value)
    ? value
        .filter((v): v is FaqItem => typeof v === 'object' && v !== null && 'question' in v && 'answer' in v)
        .map((v) => ({ question: String(v.question), answer: String(v.answer) }))
    : [];

export default function AdminCategories() {
  const { isAdmin } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const set = (patch: Partial<typeof emptyForm>) => setFormData((f) => ({ ...f, ...patch }));

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      toast.error('Failed to fetch categories');
    } else {
      setCategories(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({ ...emptyForm, sort_order: categories.length });
    setEditingCategory(null);
    setSlugError(null);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setSlugError(null);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      image_url: category.image_url || '',
      image_alt: category.image_alt,
      sort_order: category.sort_order ?? 0,
      intro_html: category.intro_html || '',
      why_choose: category.why_choose || [],
      key_features: category.key_features || [],
      benefits: category.benefits || [],
      ideal_for: category.ideal_for || [],
      faqs: asFaqs(category.faqs),
      cta_title: category.cta_title || '',
      cta_text: category.cta_text || '',
      meta_title: category.meta_title || '',
      meta_description: category.meta_description || '',
      custom_schema: category.custom_schema || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      toast.error('Admin privileges required');
      return;
    }

    const slug = slugify(formData.slug);
    const missingAlts = (formData.image_url && isAltMissing(formData.image_alt) ? 1 : 0) + countImagesMissingAlt(formData.intro_html);
    if (missingAlts > 0) {
      toast.error(missingAltMessage(missingAlts));
      return;
    }
    const schemaError = customSchemaError(formData.custom_schema);
    if (schemaError) {
      toast.error(`Custom schema: ${schemaError}`);
      return;
    }

    setSaving(true);
    const slugProblem = await validateSlugForSave('categories', slug, {
      excludeId: editingCategory?.id,
      originalSlug: editingCategory?.slug,
    });
    if (slugProblem) {
      setSlugError(slugProblem);
      toast.error(slugProblem);
      setSaving(false);
      return;
    }

    const name = formData.name.trim();
    const categoryData = {
      name,
      slug,
      description: formData.description || null,
      image_url: formData.image_url || null,
      image_alt: formData.image_url ? altForSave(formData.image_alt) : null,
      sort_order: formData.sort_order,
      intro_html: formData.intro_html || null,
      why_choose: cleanList(formData.why_choose),
      key_features: cleanList(formData.key_features),
      benefits: cleanList(formData.benefits),
      ideal_for: cleanList(formData.ideal_for),
      faqs: cleanFaqs(formData.faqs),
      cta_title: formData.cta_title.trim() || null,
      cta_text: formData.cta_text.trim() || null,
      meta_title: formData.meta_title.trim() || null,
      meta_description: formData.meta_description.trim() || null,
      custom_schema: formData.custom_schema.trim() || null,
    };

    const { error } = editingCategory
      ? await supabase.from('categories').update(categoryData).eq('id', editingCategory.id)
      : await supabase.from('categories').insert([categoryData]);

    if (error) {
      setSaving(false);
      const slugMsg = slugErrorFromDb(error);
      if (slugMsg) setSlugError(slugMsg);
      toast.error(slugMsg || (error.code === '23505' ? 'A category with this name already exists.' : `Failed to ${editingCategory ? 'update' : 'create'} category`));
      return;
    }

    // Products still store the category name as text; keep them attached after a rename.
    if (editingCategory && editingCategory.name !== name) {
      const { error: productsError } = await supabase
        .from('products')
        .update({ category: name, category_id: editingCategory.id })
        .or(`category_id.eq.${editingCategory.id},category.eq."${editingCategory.name.replace(/"/g, '\\"')}"`);
      if (productsError) toast.error('Category renamed, but its products could not be updated');
    }

    setSaving(false);
    toast.success(editingCategory ? 'Category updated' : 'Category created');
    fetchCategories();
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      toast.error('Admin privileges required');
      return;
    }

    if (!confirm('Delete this category?')) return;

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error(error.code === '23503' ? 'This category still has products. Move them first.' : 'Failed to delete category');
    } else {
      toast.success('Category deleted');
      fetchCategories();
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Categories</h1>
            <p className="text-muted-foreground">Manage product categories and their category pages</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button disabled={!isAdmin} onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-[1fr_8rem] gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => set({ name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sort_order">Sort Order</Label>
                    <Input
                      id="sort_order"
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => set({ sort_order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <SlugField
                  table="categories"
                  value={formData.slug}
                  onChange={(slug) => { set({ slug }); setSlugError(null); }}
                  title={formData.name}
                  autoFill={!editingCategory}
                  excludeId={editingCategory?.id}
                  originalSlug={editingCategory?.slug}
                  error={slugError}
                />

                <div className="space-y-2">
                  <Label htmlFor="description">Card Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => set({ description: e.target.value })}
                    rows={2}
                    placeholder="Short text for category cards (not shown on the category page)"
                  />
                </div>

                <ImageUpload
                  bucket="product-images"
                  currentUrl={formData.image_url}
                  onImageChange={(image_url) => set({ image_url })}
                  alt={formData.image_alt}
                  onAltChange={(image_alt) => set({ image_alt })}
                  allowDecorative
                  requireAlt
                  fileNameBase={formData.slug || slugify(formData.name)}
                  label="Category Image (optional, used as the page hero)"
                />

                <fieldset className="space-y-4 rounded-lg border p-4">
                  <legend className="px-1 text-sm font-semibold">Category page content</legend>
                  <p className="text-xs text-muted-foreground">Sections left empty are hidden on the category page.</p>

                  <RichTextEditor
                    label="Intro"
                    value={formData.intro_html}
                    onChange={(intro_html) => set({ intro_html })}
                    imageBucket="product-images"
                    imageFileBase={formData.slug || slugify(formData.name)}
                    minHeight={160}
                  />
                  <ListEditor id="why_choose" label="Why Choose" items={formData.why_choose} onChange={(why_choose) => set({ why_choose })} placeholder="e.g. 360° patient access" />
                  <ListEditor id="key_features" label="Key Features" items={formData.key_features} onChange={(key_features) => set({ key_features })} placeholder="e.g. CPR function" />
                  <ListEditor id="benefits" label="Benefits" items={formData.benefits} onChange={(benefits) => set({ benefits })} placeholder="e.g. Improved clinical outcomes" />
                  <ListEditor id="ideal_for" label="Ideal For" items={formData.ideal_for} onChange={(ideal_for) => set({ ideal_for })} placeholder="e.g. Intensive Care Units" />
                  <FaqListEditor items={formData.faqs} onChange={(faqs) => set({ faqs })} />

                  <div className="space-y-2">
                    <Label htmlFor="cta_title">CTA Title</Label>
                    <Input id="cta_title" value={formData.cta_title} onChange={(e) => set({ cta_title: e.target.value })} placeholder="e.g. Need help choosing an ICU bed?" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cta_text">CTA Text</Label>
                    <Textarea id="cta_text" value={formData.cta_text} onChange={(e) => set({ cta_text: e.target.value })} rows={2} />
                  </div>
                </fieldset>

                <SeoFields
                  values={formData}
                  onChange={set}
                  path={`/category/${formData.slug}`}
                  fallbackTitle={formData.name ? `${formData.name} | Mr.Bedmed Hospital Beds & Stretcher Solutions` : ''}
                  fallbackDescription={toPlainText(formData.intro_html, 160)}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving…' : editingCategory ? 'Update Category' : 'Create Category'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : categories.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No categories yet. Add your first category to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <Card key={category.id}>
                <CardContent className="p-4">
                  {category.image_url && (
                    <img
                      src={category.image_url}
                      alt={resolveAlt(category.image_alt, category.name)}
                      className="w-full h-32 object-cover rounded mb-3"
                    />
                  )}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{category.name}</h3>
                      <a href={`/category/${category.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                        /category/{category.slug} <ExternalLink className="h-3 w-3" />
                      </a>
                      {category.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{category.description}</p>
                      )}
                      {!category.intro_html && (
                        <p className="text-xs text-amber-700 mt-1">No page content yet</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(category)} disabled={!isAdmin} aria-label={`Edit ${category.name}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id)} disabled={!isAdmin} aria-label={`Delete ${category.name}`}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
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
