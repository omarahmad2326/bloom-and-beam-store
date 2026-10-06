'use client';

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
import ImageUpload from '@/components/admin/ImageUpload';
import MultiImageUpload from '@/components/admin/MultiImageUpload';
import RichTextEditor from '@/components/admin/RichTextEditor';
import SlugField, { validateSlugForSave, slugErrorFromDb } from '@/components/admin/SlugField';
import SeoFields, { customSchemaError } from '@/components/admin/SeoFields';
import ListEditor, { cleanList } from '@/components/admin/ListEditor';
import { slugify } from '@/lib/slugify';
import { toPlainText } from '@/lib/content';
import type { Tables } from '@/integrations/supabase/types';
import { altForSave, countImagesMissingAlt, isAltMissing, missingAltMessage, resolveAlt } from '@/lib/imageAlt';

type Product = Tables<'products'>;

interface Category {
  id: string;
  name: string;
}

const emptyForm = {
  name: '',
  slug: '',
  brand: '',
  short_description: '',
  description: '',
  price: '',
  original_price: '',
  image_url: '',
  image_alt: null as string | null,
  image_urls: [] as string[],
  image_alts: [] as (string | null)[],
  category: '',
  features: [] as string[],
  in_stock: true,
  condition: 'new',
  meta_title: '',
  meta_description: '',
  custom_schema: '',
};

export default function AdminProducts() {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const set = (patch: Partial<typeof emptyForm>) => setFormData((f) => ({ ...f, ...patch }));

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch products');
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Failed to fetch categories:', error);
    } else {
      setCategories(data || []);
    }
  };

  const resetForm = () => {
    setFormData({ ...emptyForm, category: categories.length > 0 ? categories[0].name : '' });
    setEditingProduct(null);
    setSlugError(null);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setSlugError(null);
    setFormData({
      name: product.name,
      slug: product.slug || '',
      brand: product.brand || '',
      short_description: product.short_description || '',
      description: product.description || '',
      price: product.price.toString(),
      original_price: product.original_price?.toString() || '',
      image_url: product.image_url || '',
      image_alt: product.image_alt,
      image_urls: product.image_urls || [],
      image_alts: product.image_alts || [],
      category: product.category,
      features: product.features || [],
      in_stock: product.in_stock,
      condition: product.condition || 'new',
      meta_title: product.meta_title || '',
      meta_description: product.meta_description || '',
      custom_schema: product.custom_schema || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      toast.error('You need admin privileges to manage products');
      return;
    }

    const slug = slugify(formData.slug);
    const missingAlts =
      (formData.image_url && isAltMissing(formData.image_alt) ? 1 : 0) +
      formData.image_urls.filter((_, i) => isAltMissing(formData.image_alts[i])).length +
      countImagesMissingAlt(formData.description);
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
    const slugProblem = await validateSlugForSave('products', slug, {
      excludeId: editingProduct?.id,
      originalSlug: editingProduct?.slug,
    });
    if (slugProblem) {
      setSlugError(slugProblem);
      toast.error(slugProblem);
      setSaving(false);
      return;
    }

    const productData = {
      name: formData.name,
      slug,
      brand: formData.brand.trim() || null,
      short_description: formData.short_description.trim() || null,
      description: formData.description || null,
      price: parseFloat(formData.price) || 0,
      original_price: formData.original_price ? parseFloat(formData.original_price) : null,
      image_url: formData.image_url || null,
      image_alt: formData.image_url ? altForSave(formData.image_alt) : null,
      image_urls: formData.image_urls,
      image_alts: formData.image_urls.map((_, i) => altForSave(formData.image_alts[i])),
      category: formData.category,
      category_id: categories.find((c) => c.name === formData.category)?.id ?? null,
      features: cleanList(formData.features),
      in_stock: formData.in_stock,
      condition: formData.condition,
      meta_title: formData.meta_title.trim() || null,
      meta_description: formData.meta_description.trim() || null,
      custom_schema: formData.custom_schema.trim() || null,
    };

    const { error } = editingProduct
      ? await supabase.from('products').update(productData).eq('id', editingProduct.id)
      : await supabase.from('products').insert([productData]);
    setSaving(false);

    if (error) {
      const slugMsg = slugErrorFromDb(error);
      if (slugMsg) setSlugError(slugMsg);
      toast.error(slugMsg || `Failed to ${editingProduct ? 'update' : 'create'} product`);
      return;
    }

    toast.success(`Product ${editingProduct ? 'updated' : 'created'} successfully`);
    fetchProducts();
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      toast.error('You need admin privileges to delete products');
      return;
    }

    if (!confirm('Are you sure you want to delete this product?')) return;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete product');
    } else {
      toast.success('Product deleted successfully');
      fetchProducts();
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Products</h1>
            <p className="text-muted-foreground">Manage your product catalog</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button disabled={!isAdmin} onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Product Name</Label>
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
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <SlugField
                  table="products"
                  value={formData.slug}
                  onChange={(slug) => { set({ slug }); setSlugError(null); }}
                  title={formData.name}
                  autoFill={!editingProduct}
                  excludeId={editingProduct?.id}
                  originalSlug={editingProduct?.slug}
                  error={slugError}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="brand">Brand</Label>
                    <Input
                      id="brand"
                      value={formData.brand}
                      onChange={(e) => set({ brand: e.target.value })}
                      placeholder="e.g. Stryker"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="condition">Condition</Label>
                    <Select value={formData.condition} onValueChange={(value) => set({ condition: value })}>
                      <SelectTrigger id="condition">
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="refurbished">Refurbished</SelectItem>
                        <SelectItem value="used">Used</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="short_description">Short Description</Label>
                  <Textarea
                    id="short_description"
                    value={formData.short_description}
                    onChange={(e) => set({ short_description: e.target.value })}
                    rows={2}
                    placeholder="One or two sentences, used on product cards and in Google's product data"
                  />
                </div>

                <RichTextEditor
                  label="Description"
                  value={formData.description}
                  onChange={(description) => set({ description })}
                  imageBucket="product-images"
                  imageFileBase={formData.slug || slugify(formData.name)}
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
                    <Label htmlFor="original_price">Original Price ($)</Label>
                    <Input
                      id="original_price"
                      type="number"
                      step="0.01"
                      value={formData.original_price}
                      onChange={(e) => set({ original_price: e.target.value })}
                    />
                  </div>
                </div>

                <ImageUpload
                  bucket="product-images"
                  currentUrl={formData.image_url}
                  onImageChange={(url) => set({ image_url: url })}
                  alt={formData.image_alt}
                  onAltChange={(image_alt) => set({ image_alt })}
                  allowDecorative
                  requireAlt
                  fileNameBase={formData.slug || slugify(formData.name)}
                  label="Main Product Image"
                />
                <MultiImageUpload
                  bucket="product-images"
                  currentUrls={formData.image_urls}
                  onImagesChange={(image_urls, image_alts) => set({ image_urls, image_alts })}
                  alts={formData.image_alts}
                  onAltsChange={(image_alts) => set({ image_alts })}
                  allowDecorative
                  requireAlt
                  fileNameBase={formData.slug || slugify(formData.name)}
                  label="Additional Images (Gallery)"
                  maxImages={10}
                />

                <ListEditor
                  id="features"
                  label="Features"
                  items={formData.features}
                  onChange={(features) => set({ features })}
                  placeholder="e.g. 700 lb capacity"
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
                  path={`/products/${formData.slug}`}
                  fallbackTitle={formData.name ? `${formData.name} | Mr.Bedmed` : ''}
                  fallbackDescription={formData.short_description || toPlainText(formData.description, 160)}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving…' : editingProduct ? 'Update Product' : 'Create Product'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No products yet. Add your first product to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {products.map((product) => (
              <Card key={product.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt={resolveAlt(product.image_alt, product.name)}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">{product.category} • /products/{product.slug || 'no-slug'}</p>
                    <p className="text-primary font-medium">{'$' + product.price}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded ${product.in_stock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {product.in_stock ? 'In Stock' : 'Out of Stock'}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(product)} disabled={!isAdmin} aria-label={`Edit ${product.name}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)} disabled={!isAdmin} aria-label={`Delete ${product.name}`}>
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
