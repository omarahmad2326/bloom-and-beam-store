'use client';

import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Copy, ExternalLink, ImageOff, Loader2, Search, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { deleteMedia, listMedia, MEDIA_SOURCES, uploadToLibrary, type MediaItem, type MediaSource } from '@/lib/mediaLibrary';
import { formatBytes } from '@/lib/media';
import { cn } from '@/lib/utils';

const MAX_BYTES = 5 * 1024 * 1024;

export const mediaQueryKey = (source: MediaSource) => ['media-library', source] as const;

/**
 * Image grid with upload and search. mode="manage" (Media Library screen): copy link, open, delete.
 * mode="pick" (editor): clicking an image calls onPick.
 */
export function MediaPicker({ mode, onPick, selectedUrl, compact, allowUpload = true }: {
  mode: 'manage' | 'pick';
  /** false where the surrounding screen has its own Upload button (editor image dialog). */
  allowUpload?: boolean;
  onPick?: (item: MediaItem) => void;
  selectedUrl?: string;
  compact?: boolean;
}) {
  const queryClient = useQueryClient();
  const [source, setSource] = useState<MediaSource>('library');
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState('');
  const [confirmDelete, setConfirmDelete] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: mediaQueryKey(source),
    queryFn: () => listMedia(source),
    staleTime: 30_000,
  });
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items;
  }, [items, search]);

  const upload = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => {
      if (!f.type.startsWith('image/')) { toast.error(`${f.name} is not an image`); return false; }
      if (f.size > MAX_BYTES) { toast.error(`${f.name} is larger than 5 MB`); return false; }
      return true;
    });
    if (!list.length) return;
    setSource('library');
    setUploading((n) => n + list.length);
    let done = 0;
    for (const f of list) {
      try {
        await uploadToLibrary(f);
        done++;
      } catch (e) {
        toast.error(`${f.name}: ${(e as Error).message || 'upload failed'}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (done) toast.success(`${done} image${done === 1 ? '' : 's'} uploaded`);
    await queryClient.invalidateQueries({ queryKey: mediaQueryKey('library') });
  };

  const copy = async (item: MediaItem) => {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopied(item.url);
      setTimeout(() => setCopied((c) => (c === item.url ? '' : c)), 1500);
    } catch {
      toast.error('Could not copy. Select the address and copy it manually.');
    }
  };

  const remove = async (item: MediaItem) => {
    try {
      await deleteMedia(item);
      toast.success(`${item.name} deleted`);
      setConfirmDelete('');
      queryClient.setQueryData<MediaItem[]>(mediaQueryKey(item.source), (old) => (old || []).filter((i) => i.path !== item.path));
    } catch (e) {
      toast.error((e as Error).message || 'Could not delete');
    }
  };

  return (
    <div className="min-w-0 space-y-3">
      {allowUpload && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files); }}
          className={cn('flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-4 text-center text-sm transition-colors', dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25')}
        >
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading > 0}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? `Uploading ${uploading}…` : 'Upload images'}
          </Button>
          <span className="text-xs text-muted-foreground">or drag and drop here · JPG, PNG, WebP, GIF, SVG up to 5 MB · converted to WebP and named from the file name</span>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files) upload(e.target.files); e.target.value = ''; }} />
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Image folders">
          {MEDIA_SOURCES.map((s) => (
            <button key={s.key} type="button" role="tab" aria-selected={source === s.key} onClick={() => setSource(s.key)}
              className={cn('rounded-md px-3 py-1.5 text-sm', source === s.key ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent')}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search file name" className="h-9 pl-9" aria-label="Search images" />
        </div>
      </div>

      <div className={cn('overflow-y-auto rounded-md border p-2', compact ? 'h-72' : 'min-h-[300px]')}>
        {isLoading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : error ? (
          <p className="p-4 text-sm text-destructive">Could not load images: {(error as Error).message}</p>
        ) : visible.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <ImageOff className="h-6 w-6" aria-hidden="true" />
            {items.length ? 'No images match your search.' : source === 'library' ? 'No images yet. Upload the first one above.' : 'No images in this folder.'}
          </div>
        ) : (
          <ul className={cn('grid gap-2', compact ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5')}>
            {visible.map((item) => {
              const selected = selectedUrl === item.url || selectedUrl === item.relUrl;
              return (
                <li key={`${item.bucket}/${item.path}`} className={cn('group min-w-0 overflow-hidden rounded-md border bg-background', selected && 'ring-2 ring-primary')}>
                  {mode === 'pick' ? (
                    <button type="button" onClick={() => onPick?.(item)} className="block w-full text-left" aria-label={`Use ${item.name}`} title={item.name}>
                      <Thumb item={item} />
                      <span className="block truncate px-2 py-1 text-xs">{item.name}</span>
                    </button>
                  ) : (
                    <>
                      <Thumb item={item} />
                      <div className="space-y-1 p-2">
                        <p className="truncate text-xs font-medium" title={item.name}>{item.name}</p>
                        <p className="text-[11px] text-muted-foreground">{formatBytes(item.size)}</p>
                        <input readOnly value={item.url} onFocus={(e) => e.target.select()} aria-label={`Address of ${item.name}`}
                          className="w-full truncate rounded border bg-muted px-1.5 py-1 font-mono text-[11px]" />
                        {confirmDelete === item.path ? (
                          <div className="flex gap-1">
                            <Button type="button" size="sm" variant="destructive" className="h-7 flex-1 px-2 text-xs" onClick={() => remove(item)}>Delete</Button>
                            <Button type="button" size="sm" variant="outline" className="h-7 flex-1 px-2 text-xs" onClick={() => setConfirmDelete('')}>Keep</Button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <Button type="button" size="sm" variant="outline" className="h-7 flex-1 px-2 text-xs" onClick={() => copy(item)}>
                              {copied === item.url ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied === item.url ? 'Copied' : 'Copy link'}
                            </Button>
                            <Button asChild size="icon" variant="ghost" className="h-7 w-7">
                              <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${item.name}`}><ExternalLink className="h-3.5 w-3.5" /></a>
                            </Button>
                            <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setConfirmDelete(item.path)} aria-label={`Delete ${item.name}`}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Thumb({ item }: { item: MediaItem }) {
  return (
    <div className="flex aspect-square items-center justify-center bg-muted">
      {/* relUrl: same-origin /media/... so it also works before Cloudflare has the image cached */}
      <img src={item.relUrl} alt="" loading="lazy" className="h-full w-full object-contain" />
    </div>
  );
}
