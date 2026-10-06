import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import ImageUpload from '@/components/admin/ImageUpload';
import RichTextEditor from '@/components/admin/RichTextEditor';
import SlugField, { validateSlugForSave, slugErrorFromDb } from '@/components/admin/SlugField';
import SeoFields, { customSchemaError } from '@/components/admin/SeoFields';
import ListEditor, { cleanList } from '@/components/admin/ListEditor';
import { slugify } from '@/lib/slugify';
import type { Tables } from '@/integrations/supabase/types';
import { altForSave, countImagesMissingAlt, isAltMissing, missingAltMessage, resolveAlt } from '@/lib/imageAlt';

type Service = Tables<'services'>;

const iconOptions = [
  { value: 'ClipboardCheck', label: 'Clipboard Check' },
  { value: 'Wrench', label: 'Wrench' },
  { value: 'Gauge', label: 'Gauge' },
  { value: 'Calendar', label: 'Calendar' },
  { value: 'RefreshCw', label: 'Refresh' },
  { value: 'ShoppingCart', label: 'Shopping Cart' },
  { value: 'Package', label: 'Package' },
  { value: 'Trash2', label: 'Trash' },
  { value: 'FileText', label: 'File Text' },
  { value: 'Settings', label: 'Settings' },
  { value: 'Shield', label: 'Shield' },
  { value: 'Heart', label: 'Heart' },
];

const emptyForm = {
  slug: '',
  icon: 'ClipboardCheck',
  title: '',
  short_desc: '',
  hero_title: '',
  overview_html: '',
  why_choose_title: 'Why Choose Our Services?',
  features: [] as string[],
  areas_served: [] as string[],
  image_url: '',
  image_alt: null as string | null,
  sort_order: 0,
  published: true,
  meta_title: '',
  meta_description: '',
  custom_schema: '',
};

/** Legacy services stored the overview as an array of plain paragraphs. */
const legacyOverviewHtml = (paragraphs: string[]) =>
  paragraphs
    .map((p) => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
    .join('');

export default function AdminServices() {
  const { isAdmin } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const set = (patch: Partial<typeof emptyForm>) => setFormData((f) => ({ ...f, ...patch }));

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      toast.error('Failed to fetch services');
    } else {
      setServices(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({ ...emptyForm, sort_order: services.length + 1 });
    setEditingService(null);
    setSlugError(null);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setSlugError(null);
    setFormData({
      slug: service.slug,
      icon: service.icon,
      title: service.title,
      short_desc: service.short_desc,
      hero_title: service.hero_title,
      overview_html: service.overview_html || legacyOverviewHtml(service.overview || []),
      why_choose_title: service.why_choose_title,
      features: service.features || [],
      areas_served: service.areas_served || [],
      image_url: service.image_url || '',
      image_alt: service.image_alt,
      sort_order: service.sort_order ?? 0,
      published: service.published,
      meta_title: service.meta_title || '',
      meta_description: service.meta_description || '',
      custom_schema: service.custom_schema || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      toast.error('You need admin privileges to manage services');
      return;
    }

    const slug = slugify(formData.slug);
    if (formData.published) {
      const missingAlts = (formData.image_url && isAltMissing(formData.image_alt) ? 1 : 0) + countImagesMissingAlt(formData.overview_html);
      if (missingAlts > 0) {
        toast.error(`${missingAltMessage(missingAlts)} You can save it as a draft first.`);
        return;
      }
    }
    const schemaError = customSchemaError(formData.custom_schema);
    if (schemaError) {
      toast.error(`Custom schema: ${schemaError}`);
      return;
    }

    setSaving(true);
    const slugProblem = await validateSlugForSave('services', slug, {
      excludeId: editingService?.id,
      originalSlug: editingService?.slug,
    });
    if (slugProblem) {
      setSlugError(slugProblem);
      toast.error(slugProblem);
      setSaving(false);
      return;
    }

    const serviceData = {
      slug,
      icon: formData.icon,
      title: formData.title,
      short_desc: formData.short_desc,
      hero_title: formData.hero_title || formData.title,
      overview_html: formData.overview_html || null,
      why_choose_title: formData.why_choose_title,
      features: cleanList(formData.features),
      areas_served: cleanList(formData.areas_served),
      image_url: formData.image_url || null,
      image_alt: formData.image_url ? altForSave(formData.image_alt) : null,
      sort_order: formData.sort_order,
      published: formData.published,
      meta_title: formData.meta_title.trim() || null,
      meta_description: formData.meta_description.trim() || null,
      custom_schema: formData.custom_schema.trim() || null,
    };

    const { error } = editingService
      ? await supabase.from('services').update(serviceData).eq('id', editingService.id)
      : await supabase.from('services').insert([serviceData]);
    setSaving(false);

    if (error) {
      console.error(error);
      const slugMsg = slugErrorFromDb(error);
      if (slugMsg) setSlugError(slugMsg);
      toast.error(slugMsg || `Failed to ${editingService ? 'update' : 'create'} service`);
      return;
    }

    toast.success(`Service ${editingService ? 'updated' : 'created'} successfully`);
    fetchServices();
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      toast.error('You need admin privileges to delete services');
      return;
    }

    if (!confirm('Are you sure you want to delete this service?')) return;

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete service');
    } else {
      toast.success('Service deleted successfully');
      fetchServices();
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Services</h1>
            <p className="text-muted-foreground">Manage your service offerings</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button disabled={!isAdmin} onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Service
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingService ? 'Edit Service' : 'Add New Service'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Service Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => set({ title: e.target.value })}
                    required
                  />
                </div>

                <SlugField
                  table="services"
                  value={formData.slug}
                  onChange={(slug) => { set({ slug }); setSlugError(null); }}
                  title={formData.title}
                  autoFill={!editingService}
                  excludeId={editingService?.id}
                  originalSlug={editingService?.slug}
                  isPublished={editingService?.published ?? false}
                  error={slugError}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="icon">Icon</Label>
                    <Select value={formData.icon} onValueChange={(value) => set({ icon: value })}>
                      <SelectTrigger id="icon">
                        <SelectValue placeholder="Select an icon" />
                      </SelectTrigger>
                      <SelectContent>
                        {iconOptions.map((icon) => (
                          <SelectItem key={icon.value} value={icon.value}>
                            {icon.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

                <div className="space-y-2">
                  <Label htmlFor="short_desc">Short Description (for cards)</Label>
                  <Textarea
                    id="short_desc"
                    value={formData.short_desc}
                    onChange={(e) => set({ short_desc: e.target.value })}
                    rows={2}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hero_title">Hero Title (for detail page)</Label>
                  <Input
                    id="hero_title"
                    value={formData.hero_title}
                    onChange={(e) => set({ hero_title: e.target.value })}
                    placeholder="Defaults to service title"
                  />
                </div>

                <ImageUpload
                  bucket="site-images"
                  currentUrl={formData.image_url}
                  onImageChange={(image_url) => set({ image_url })}
                  alt={formData.image_alt}
                  onAltChange={(image_alt) => set({ image_alt })}
                  allowDecorative
                  requireAlt={formData.published}
                  fileNameBase={formData.slug || slugify(formData.title)}
                  label="Hero Image (optional)"
                />

                <RichTextEditor
                  label="Service Overview"
                  value={formData.overview_html}
                  onChange={(overview_html) => set({ overview_html })}
                  imageBucket="site-images"
                  imageFileBase={formData.slug || slugify(formData.title)}
                />

                <div className="space-y-2">
                  <Label htmlFor="why_choose_title">Why Choose Section Title</Label>
                  <Input
                    id="why_choose_title"
                    value={formData.why_choose_title}
                    onChange={(e) => set({ why_choose_title: e.target.value })}
                  />
                </div>

                <ListEditor
                  id="features"
                  label="Why Choose Points"
                  items={formData.features}
                  onChange={(features) => set({ features })}
                  placeholder="e.g. Quick Turnaround Time"
                />

                <ListEditor
                  id="areas_served"
                  label="Cities Served"
                  items={formData.areas_served}
                  onChange={(areas_served) => set({ areas_served })}
                  placeholder="e.g. Dallas"
                  help="Used for the service's areaServed in Google structured data."
                />

                <div className="flex items-center gap-2">
                  <Switch
                    id="published"
                    checked={formData.published}
                    onCheckedChange={(checked) => set({ published: checked })}
                  />
                  <Label htmlFor="published">Published</Label>
                </div>

                <SeoFields
                  values={formData}
                  onChange={set}
                  path={`/services/${formData.slug}`}
                  fallbackTitle={formData.title ? `${formData.title} | Mr.Bedmed Services` : ''}
                  fallbackDescription={formData.short_desc}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving…' : editingService ? 'Update Service' : 'Create Service'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : services.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No services yet. Add your first service to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {services.map((service) => (
              <Card key={service.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <span className="text-primary text-lg font-bold">{service.sort_order}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{service.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">/services/{service.slug} • {service.short_desc}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded ${service.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {service.published ? 'Published' : 'Draft'}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(service)} disabled={!isAdmin} aria-label={`Edit ${service.title}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(service.id)} disabled={!isAdmin} aria-label={`Delete ${service.title}`}>
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
