import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploadProps {
  bucket: 'product-images' | 'blog-images' | 'site-images' | 'parts-images';
  currentUrl: string;
  onImageChange: (url: string) => void;
  label?: string;
  /** When provided, an ALT text input is shown for the image. */
  alt?: string;
  onAltChange?: (alt: string) => void;
}

export default function ImageUpload({ bucket, currentUrl, onImageChange, label = 'Image', alt, onAltChange }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string>(currentUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      setPreview(publicUrl);
      onImageChange(publicUrl);
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error((error as Error).message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview('');
    onImageChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUrlChange = (url: string) => {
    setPreview(url);
    onImageChange(url);
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      
      {preview ? (
        <div className="relative w-full h-40 rounded-lg overflow-hidden border border-border bg-muted">
          <img
            src={preview}
            alt={alt || 'Preview'}
            className="w-full h-full object-cover"
            onError={() => setPreview('')}
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          className="w-full h-40 rounded-lg border-2 border-dashed border-border bg-muted/50 flex flex-col items-center justify-center cursor-pointer hover:bg-muted transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Click to upload or drag & drop</p>
          <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex-1"
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? 'Uploading...' : 'Upload Image'}
        </Button>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Or paste image URL</Label>
        <Input
          type="url"
          value={preview}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="https://example.com/image.jpg"
        />
      </div>

      {onAltChange && (
        <div className="space-y-1">
          <Label htmlFor={`${bucket}-alt`} className="text-xs">ALT text</Label>
          <Input
            id={`${bucket}-alt`}
            value={alt || ''}
            onChange={(e) => onAltChange(e.target.value)}
            placeholder="Describe the image for screen readers and Google Images"
          />
          {preview && !alt?.trim() && (
            <p className="text-xs text-amber-700">Add ALT text so this image is accessible and indexable.</p>
          )}
        </div>
      )}
    </div>
  );
}
