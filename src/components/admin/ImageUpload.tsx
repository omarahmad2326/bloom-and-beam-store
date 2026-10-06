import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { uploadImage } from '@/lib/imageUpload';
import { isAltMissing, isDecorative } from '@/lib/imageAlt';

interface ImageUploadProps {
  bucket: 'product-images' | 'blog-images' | 'site-images' | 'parts-images';
  currentUrl: string;
  onImageChange: (url: string) => void;
  label?: string;
  /** When provided, an ALT text input is shown for the image. */
  alt?: string | null;
  onAltChange?: (alt: string | null) => void;
  /** Show a "Decorative image" checkbox; ticking it stores alt = '' (outputs alt=""). */
  allowDecorative?: boolean;
  /** Highlight a missing ALT as an error (the form blocks saving). */
  requireAlt?: boolean;
  /** Uploaded file is named from this (usually the slug), e.g. stryker-1115-prime-stretcher.webp. */
  fileNameBase?: string;
}

export default function ImageUpload({
  bucket, currentUrl, onImageChange, label = 'Image', alt, onAltChange, allowDecorative = false, requireAlt = false, fileNameBase,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string>(currentUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const altId = useId();

  useEffect(() => setPreview(currentUrl), [currentUrl]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const publicUrl = await uploadImage(bucket, file, { nameBase: fileNameBase });
      setPreview(publicUrl);
      onImageChange(publicUrl);
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error((error as Error).message || 'Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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

  const decorative = allowDecorative && isDecorative(alt);
  const altMissing = !!preview && isAltMissing(alt);

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
            aria-label="Remove image"
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
          <p className="text-sm text-muted-foreground">Click to upload</p>
          <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB, saved as WebP</p>
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
        <div className="space-y-1.5">
          <Label htmlFor={altId} className="text-xs">
            ALT text {requireAlt && preview && <span className="text-destructive">*</span>}
          </Label>
          <Input
            id={altId}
            value={decorative ? '' : alt ?? ''}
            disabled={decorative}
            onChange={(e) => onAltChange(allowDecorative && e.target.value === '' ? null : e.target.value)}
            placeholder={decorative ? 'Decorative: no ALT text (alt="")' : 'e.g. Stryker 1115 Prime stretcher, side rails up'}
            aria-invalid={requireAlt && altMissing}
            className={requireAlt && altMissing ? 'border-destructive' : ''}
          />
          {allowDecorative && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox checked={decorative} onCheckedChange={(checked) => onAltChange(checked ? '' : null)} />
              Decorative image (adds no information, so screen readers skip it)
            </label>
          )}
          {altMissing && (
            <p className={requireAlt ? 'text-xs font-medium text-destructive' : 'text-xs text-amber-700'}>
              {requireAlt ? 'ALT text is required (or tick "Decorative image").' : 'Add ALT text so this image is accessible and indexable.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
