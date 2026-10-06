import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { uploadImage } from '@/lib/imageUpload';
import { isAltMissing, isDecorative } from '@/lib/imageAlt';

type Alt = string | null;

interface MultiImageUploadProps {
  bucket: string;
  currentUrls: string[];
  /** Called with the new URL list and the ALT list kept aligned to it. */
  onImagesChange: (urls: string[], alts: Alt[]) => void;
  label?: string;
  maxImages?: number;
  /** ALT text per image (same order as currentUrls). When provided, ALT inputs are shown. */
  alts?: Alt[];
  onAltsChange?: (alts: Alt[]) => void;
  /** Per-image "Decorative image" checkbox; ticking stores '' (outputs alt=""). */
  allowDecorative?: boolean;
  requireAlt?: boolean;
  /** Folder inside the bucket. */
  folder?: string;
  /** Files are named from this (usually the slug): slug.webp, slug-2.webp, … */
  fileNameBase?: string;
}

export default function MultiImageUpload({
  bucket,
  currentUrls,
  onImagesChange,
  label = 'Additional Images',
  maxImages = 10,
  alts,
  onAltsChange,
  allowDecorative = false,
  requireAlt = false,
  folder,
  fileNameBase,
}: MultiImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const alignedAlts: Alt[] = currentUrls.map((_, i) => alts?.[i] ?? null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - currentUrls.length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setUploading(true);

    try {
      const uploadedUrls: string[] = [];
      for (const file of filesToUpload) {
        try {
          uploadedUrls.push(await uploadImage(bucket, file, { nameBase: fileNameBase, folder }));
        } catch (error) {
          console.error('Upload error:', error);
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      if (uploadedUrls.length > 0) {
        onImagesChange([...currentUrls, ...uploadedUrls], [...alignedAlts, ...uploadedUrls.map(() => null)]);
        toast.success(`${uploadedUrls.length} image(s) uploaded successfully`);
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = (indexToRemove: number) => {
    onImagesChange(
      currentUrls.filter((_, index) => index !== indexToRemove),
      alignedAlts.filter((_, index) => index !== indexToRemove),
    );
  };

  const setAlt = (index: number, value: Alt) => {
    onAltsChange?.(alignedAlts.map((a, i) => (i === index ? value : a)));
  };

  const missingCount = alignedAlts.filter(isAltMissing).length;

  return (
    <div className="space-y-3">
      <Label>{label}</Label>

      {currentUrls.length > 0 && (
        <div className={onAltsChange ? 'grid grid-cols-2 gap-3 sm:grid-cols-3' : 'grid grid-cols-4 gap-3'}>
          {currentUrls.map((url, index) => {
            const alt = alignedAlts[index];
            const decorative = allowDecorative && isDecorative(alt);
            const missing = isAltMissing(alt);
            return (
              <div key={`${url}-${index}`} className="space-y-1">
                <div className="relative group aspect-square">
                  <img src={url} alt={alt || `Image ${index + 1}`} className="w-full h-full object-cover rounded-lg border" />
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    aria-label={`Remove image ${index + 1}`}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shadow-lg"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {onAltsChange && (
                  <>
                    <Input
                      value={decorative ? '' : alt ?? ''}
                      disabled={decorative}
                      onChange={(e) => setAlt(index, allowDecorative && e.target.value === '' ? null : e.target.value)}
                      placeholder={decorative ? 'Decorative' : 'ALT text'}
                      aria-label={`ALT text for image ${index + 1}`}
                      aria-invalid={requireAlt && missing}
                      className={`h-8 text-xs ${requireAlt && missing ? 'border-destructive' : ''}`}
                    />
                    {allowDecorative && (
                      <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Checkbox
                          checked={decorative}
                          onCheckedChange={(checked) => setAlt(index, checked ? '' : null)}
                          aria-label={`Image ${index + 1} is decorative`}
                          className="h-3.5 w-3.5"
                        />
                        Decorative
                      </label>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {onAltsChange && requireAlt && missingCount > 0 && (
        <p className="text-xs font-medium text-destructive">
          {missingCount} image{missingCount === 1 ? '' : 's'} need ALT text (or tick "Decorative").
        </p>
      )}

      {currentUrls.length < maxImages && (
        <div className="flex items-center gap-4">
          <Button type="button" variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()} className="w-full">
            {uploading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>
            ) : (
              <><Upload className="h-4 w-4 mr-2" /> Add Images ({currentUrls.length}/{maxImages})</>
            )}
          </Button>
          <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
        </div>
      )}

      {currentUrls.length === 0 && (
        <div className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground">
          <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No images yet</p>
        </div>
      )}
    </div>
  );
}
