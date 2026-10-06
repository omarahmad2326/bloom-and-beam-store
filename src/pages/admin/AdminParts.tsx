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
import { Plus, Pencil, Trash2 } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { slugify } from '@/lib/slugify';
import { toPlainText } from '@/lib/content';
import MultiImageUpload from '@/components/admin/MultiImageUpload';
import RichTextEditor from '@/components/admin/RichTextEditor';
import SlugField, { validateSlugForSave, slugErrorFromDb } from '@/components/admin/SlugField';
import SeoFields, { customSchemaError } from '@/components/admin/SeoFields';

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface Part {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  price: number;
  category: string;
  image_urls: string[];
  in_stock: boolean;
  sort_order: number;
  make: string | null;
  model: string | null;
  sku: string | null;
  condition: string;
  part_no: string | null;
  asset_no: string | null;
  oem_no: string | null;
  short_description: string | null;
  image_alts: string[];
  meta_title: string | null;
  meta_description: string | null;
  custom_schema: string | null;
}

const emptyForm = {
  name: '',
  slug: '',
  short_description: '',
  description: '',
  price: '',
  category: '',
  image_urls: [] as string[],
  image_alts: [] as string[],
  in_stock: true,
  sort_order: 0,
  make: '',
  model: '',
  sku: '',
  condition: 'new',
  part_no: '',
  asset_no: '',
  oem_no: '',
  meta_title: '',
  meta_description: '',
  custom_schema: '',
};

export default function AdminParts() {
  const { isAdmin } = useAuth();
  const [parts, setParts] = useState<Part[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [saving, setSaving] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const set = (patch: Partial<typeof emptyForm>) => setFormData((f) => ({ ...f, ...patch }));

  useEffect(() => {
    fetchParts();
    fetchCategoryOptions();
  }, []);

  const fetchParts = async () => {
    const { data, error } = await supabase
      .from('parts')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      toast.error('Failed to fetch parts');
    } else {
      setParts(data || []);
    }
    setLoading(false);
  };

  const fetchCategoryOptions = async () => {
    // Fetch all categories from home_service_card_items
    const { data, error } = await supabase
      .from('home_service_card_items')
      .select('*')
      .order('sort_order', { ascending: true });

    if (!error && data) {
      setCategoryOptions(data);
    }
  };

  const resetForm = () => {
    setFormData({
      ...emptyForm,
      category: categoryOptions.length > 0 ? categoryOptions[0].name : '',
      sort_order: parts.length,
    });
    setEditingPart(null);
    setSlugError(null);
  };

  const handleEdit = (part: Part) => {
    setEditingPart(part);
    setSlugError(null);
    setFormData({
      name: part.name,
      slug: part.slug || '',
      short_description: part.short_description || '',
      description: part.description || '',
      price: part.price.toString(),
      category: part.category,
      image_urls: part.image_urls || [],
      image_alts: part.image_alts || [],
      in_stock: part.in_stock,
      sort_order: part.sort_order,
      make: part.make || '',
      model: part.model || '',
      sku: part.sku || '',
      condition: part.condition || 'new',
      part_no: part.part_no || '',
      asset_no: part.asset_no || '',
      oem_no: part.oem_no || '',
      meta_title: part.meta_title || '',
      meta_description: part.meta_description || '',
      custom_schema: part.custom_schema || '',
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
    const schemaError = customSchemaError(formData.custom_schema);
    if (schemaError) {
      toast.error(`Custom schema: ${schemaError}`);
      return;
    }

    setSaving(true);
    const slugProblem = await validateSlugForSave('parts', slug, {
      excludeId: editingPart?.id,
      originalSlug: editingPart?.slug,
    });
    if (slugProblem) {
      setSlugError(slugProblem);
      toast.error(slugProblem);
      setSaving(false);
      return;
    }

    const partData = {
      name: formData.name,
      slug,
      short_description: formData.short_description.trim() || null,
      description: formData.description || null,
      price: parseFloat(formData.price) || 0,
      category: formData.category,
      image_urls: formData.image_urls,
      image_alts: formData.image_urls.map((_, i) => (formData.image_alts[i] || '').trim()),
      in_stock: formData.in_stock,
      sort_order: formData.sort_order,
      make: formData.make || null,
      model: formData.model || null,
      sku: formData.sku || null,
      condition: formData.condition,
      part_no: formData.part_no || null,
      asset_no: formData.asset_no || null,
      oem_no: formData.oem_no || null,
      meta_title: formData.meta_title.trim() || null,
      meta_description: formData.meta_description.trim() || null,
      custom_schema: formData.custom_schema.trim() || null,
    };

    const { error } = editingPart
      ? await supabase.from('parts').update(partData).eq('id', editingPart.id)
      : await supabase.from('parts').insert([partData]);
    setSaving(false);

    if (error) {
      const slugMsg = slugErrorFromDb(error);
      if (slugMsg) setSlugError(slugMsg);
      toast.error(slugMsg || `Failed to ${editingPart ? 'update' : 'create'} part`);
      return;
    }

    toast.success(editingPart ? 'Part updated' : 'Part created');
    fetchParts();
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      toast.error('Admin privileges required');
      return;
    }

    if (!confirm('Delete this part?')) return;

    const { error } = await supabase
      .from('parts')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete part');
    } else {
      toast.success('Part deleted');
      fetchParts();
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Parts</h1>
            <p className="text-muted-foreground">Manage spare parts with image carousels</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button disabled={!isAdmin} onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Part
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPart ? 'Edit Part' : 'Add New Part'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Part Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => set({ name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => set({ category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <SlugField
                  table="parts"
                  value={formData.slug}
                  onChange={(slug) => { set({ slug }); setSlugError(null); }}
                  title={formData.name}
                  autoFill={!editingPart}
                  excludeId={editingPart?.id}
                  originalSlug={editingPart?.slug}
                  error={slugError}
                />

                {/* Condition Dropdown */}
                <div className="space-y-2">
                  <Label htmlFor="condition">Condition</Label>
                  <select
                    id="condition"
                    value={formData.condition}
                    onChange={(e) => set({ condition: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="new">New</option>
                    <option value="used">Used</option>
                    <option value="refurbished">Refurbished</option>
                  </select>
                </div>

                {/* Part Numbers Row */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="part_no">Part No.</Label>
                    <Input
                      id="part_no"
                      value={formData.part_no}
                      onChange={(e) => set({ part_no: e.target.value })}
                      placeholder="e.g., P-12345"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="asset_no">Asset No.</Label>
                    <Input
                      id="asset_no"
                      value={formData.asset_no}
                      onChange={(e) => set({ asset_no: e.target.value })}
                      placeholder="e.g., A-67890"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="oem_no">OEM No.</Label>
                    <Input
                      id="oem_no"
                      value={formData.oem_no}
                      onChange={(e) => set({ oem_no: e.target.value })}
                      placeholder="e.g., OEM-11111"
                    />
                  </div>
                </div>

                {/* Make, Model, SKU Fields */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="make">Manufacturer</Label>
                    <Input
                      id="make"
                      value={formData.make}
                      onChange={(e) => set({ make: e.target.value })}
                      placeholder="e.g., Stryker"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      value={formData.model}
                      onChange={(e) => set({ model: e.target.value })}
                      placeholder="e.g., InTouch"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e) => set({ sku: e.target.value })}
                      placeholder="e.g., STR-001"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="short_description">Short Description</Label>
                  <Textarea
                    id="short_description"
                    value={formData.short_description}
                    onChange={(e) => set({ short_description: e.target.value })}
                    rows={2}
                    placeholder="One or two sentences, used on part cards and in Google's product data"
                  />
                </div>
                <RichTextEditor
                  label="Description"
                  value={formData.description}
                  onChange={(description) => set({ description })}
                  imageBucket="parts-images"
                  minHeight={160}
                />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Price ($)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => set({ price: e.target.value })}
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
                
                <MultiImageUpload
                  bucket="parts-images"
                  folder="parts"
                  currentUrls={formData.image_urls}
                  onImagesChange={(image_urls, image_alts) => set({ image_urls, image_alts })}
                  alts={formData.image_alts}
                  onAltsChange={(image_alts) => set({ image_alts })}
                  label="Images (Carousel)"
                  maxImages={10}
                />

                <div className="flex items-center gap-2">
                  <Switch
                    id="in_stock"
                    checked={formData.in_stock}
                    onCheckedChange={(checked) => set({ in_stock: checked })}
                  />
                  <Label htmlFor="in_stock">In Stock</Label>
                </div>

                <SeoFields
                  values={formData}
                  onChange={set}
                  path={`/part/${formData.slug}`}
                  fallbackTitle={formData.name ? `${formData.name} | Mr.Bedmed Parts` : ''}
                  fallbackDescription={formData.short_description || toPlainText(formData.description, 160)}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving…' : editingPart ? 'Update Part' : 'Create Part'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : parts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No parts yet. Add your first part to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {parts.map((part) => (
              <Card key={part.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  {part.image_urls && part.image_urls.length > 0 && (
                    <img
                      src={part.image_urls[0]}
                      alt={part.image_alts?.[0] || part.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold">{part.name}</h3>
                    <p className="text-sm text-muted-foreground">{part.category} • /part/{part.slug || 'no-slug'}</p>
                    <p className="text-primary font-medium">${part.price}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded ${part.in_stock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {part.in_stock ? 'In Stock' : 'Out of Stock'}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(part)} disabled={!isAdmin}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(part.id)} disabled={!isAdmin}>
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
