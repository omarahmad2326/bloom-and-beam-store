import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import ImageUpload from '@/components/admin/ImageUpload';
import RichTextEditor from '@/components/admin/RichTextEditor';
import SlugField, { validateSlugForSave, slugErrorFromDb } from '@/components/admin/SlugField';
import SeoFields, { customSchemaError } from '@/components/admin/SeoFields';
import { slugify } from '@/lib/slugify';
import { isContentEmpty } from '@/lib/content';
import type { Tables } from '@/integrations/supabase/types';

type BlogPost = Tables<'blog_posts'>;

const emptyForm = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  image_url: '',
  image_alt: '',
  category: 'Industry News',
  author: 'Mr.Bedmed Team',
  published: false,
  meta_title: '',
  meta_description: '',
  meta_keywords: '',
  canonical_url: '',
  read_time: '5 min read',
  custom_schema: '',
};

export default function AdminBlog() {
  const { isAdmin } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const set = (patch: Partial<typeof emptyForm>) => setFormData((f) => ({ ...f, ...patch }));

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch blog posts');
    } else {
      setPosts(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingPost(null);
    setSlugError(null);
  };

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    setSlugError(null);
    setFormData({
      title: post.title,
      slug: post.slug || '',
      excerpt: post.excerpt || '',
      content: post.content,
      image_url: post.image_url || '',
      image_alt: post.image_alt || '',
      category: post.category,
      author: post.author,
      published: post.published,
      meta_title: post.meta_title || '',
      meta_description: post.meta_description || '',
      meta_keywords: post.meta_keywords || '',
      canonical_url: post.canonical_url || '',
      read_time: post.read_time || '5 min read',
      custom_schema: post.custom_schema || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAdmin) {
      toast.error('You need admin privileges to manage blog posts');
      return;
    }

    if (isContentEmpty(formData.content)) {
      toast.error('Content is required');
      return;
    }

    const slug = slugify(formData.slug);
    const schemaError = customSchemaError(formData.custom_schema);
    if (schemaError) {
      toast.error(`Custom schema: ${schemaError}`);
      return;
    }

    setSaving(true);
    const slugProblem = await validateSlugForSave('blog_posts', slug, {
      excludeId: editingPost?.id,
      originalSlug: editingPost?.slug,
    });
    if (slugProblem) {
      setSlugError(slugProblem);
      toast.error(slugProblem);
      setSaving(false);
      return;
    }

    const postData = {
      title: formData.title,
      slug,
      excerpt: formData.excerpt || null,
      content: formData.content,
      image_url: formData.image_url || null,
      image_alt: formData.image_alt.trim() || null,
      category: formData.category,
      author: formData.author,
      published: formData.published,
      meta_title: formData.meta_title || null,
      meta_description: formData.meta_description || null,
      meta_keywords: formData.meta_keywords || null,
      canonical_url: formData.canonical_url || null,
      read_time: formData.read_time || null,
      custom_schema: formData.custom_schema.trim() || null,
    };

    const { error } = editingPost
      ? await supabase.from('blog_posts').update(postData).eq('id', editingPost.id)
      : await supabase.from('blog_posts').insert([postData]);
    setSaving(false);

    if (error) {
      const slugMsg = slugErrorFromDb(error);
      if (slugMsg) setSlugError(slugMsg);
      toast.error(slugMsg || `Failed to ${editingPost ? 'update' : 'create'} blog post`);
      return;
    }

    toast.success(`Blog post ${editingPost ? 'updated' : 'created'} successfully`);
    fetchPosts();
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      toast.error('You need admin privileges to delete blog posts');
      return;
    }

    if (!confirm('Are you sure you want to delete this blog post?')) return;

    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete blog post');
    } else {
      toast.success('Blog post deleted successfully');
      fetchPosts();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Blog Posts</h1>
            <p className="text-muted-foreground">Create and manage blog articles</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button disabled={!isAdmin} onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                New Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPost ? 'Edit Blog Post' : 'Create New Post'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => set({ title: e.target.value })}
                    required
                  />
                </div>
                <SlugField
                  table="blog_posts"
                  value={formData.slug}
                  onChange={(slug) => { set({ slug }); setSlugError(null); }}
                  title={formData.title}
                  autoFill={!editingPost}
                  excludeId={editingPost?.id}
                  originalSlug={editingPost?.slug}
                  isPublished={editingPost?.published ?? false}
                  error={slugError}
                />
                <div className="space-y-2">
                  <Label htmlFor="excerpt">Excerpt</Label>
                  <Textarea
                    id="excerpt"
                    value={formData.excerpt}
                    onChange={(e) => set({ excerpt: e.target.value })}
                    rows={2}
                    placeholder="Brief summary of the post..."
                  />
                </div>
                <RichTextEditor
                  label="Content"
                  value={formData.content}
                  onChange={(content) => set({ content })}
                  imageBucket="blog-images"
                  minHeight={320}
                />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => set({ category: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="author">Author</Label>
                    <Input
                      id="author"
                      value={formData.author}
                      onChange={(e) => set({ author: e.target.value })}
                    />
                  </div>
                </div>
                <ImageUpload
                  bucket="blog-images"
                  currentUrl={formData.image_url}
                  onImageChange={(image_url) => set({ image_url })}
                  alt={formData.image_alt}
                  onAltChange={(image_alt) => set({ image_alt })}
                  label="Featured Image"
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
                  path={`/blog/${formData.slug}`}
                  fallbackTitle={formData.title}
                  fallbackDescription={formData.excerpt}
                  required
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving…' : editingPost ? 'Update Post' : 'Create Post'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : posts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No blog posts yet. Create your first post to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {posts.map((post) => (
              <Card key={post.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt={post.image_alt || post.title}
                      className="w-20 h-14 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold">{post.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {post.category} • {post.author} • {formatDate(post.published_at || post.created_at)} • /blog/{post.slug || post.id}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded ${post.published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {post.published ? 'Published' : 'Draft'}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(post)} disabled={!isAdmin} aria-label={`Edit ${post.title}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(post.id)} disabled={!isAdmin} aria-label={`Delete ${post.title}`}>
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
