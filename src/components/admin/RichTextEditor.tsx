import { useEffect, useRef, useState } from 'react';
import { useEditor, useEditorState, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { TableKit } from '@tiptap/extension-table';
import { useQuery } from '@tanstack/react-query';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Heading2, Heading3, Heading4, Pilcrow,
  List, ListOrdered, Quote, Minus, Link2, Unlink, ImagePlus, RemoveFormatting, Undo2, Redo2, Code2, Search, Upload, Loader2,
  Table2, BetweenHorizontalEnd, BetweenVerticalEnd, Rows3, Columns3, PanelTop, Grid2x2X,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { contentToHtml, sanitizeHtml } from '@/lib/content';
import { uploadImage } from '@/lib/imageUpload';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type ImageBucket = 'product-images' | 'blog-images' | 'site-images' | 'parts-images';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  label?: string;
  placeholder?: string;
  /** Storage bucket for images inserted into the content. */
  imageBucket?: ImageBucket;
  /** Uploaded images are named from this (usually the item's slug), e.g. my-post.webp. */
  imageFileBase?: string;
  minHeight?: number;
  id?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  label,
  placeholder = 'Start writing…',
  imageBucket = 'site-images',
  imageFileBase,
  minHeight = 220,
  id,
}: RichTextEditorProps) {
  const lastEmitted = useRef<string>(value);
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceHtml, setSourceHtml] = useState('');
  const [linkOpen, setLinkOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        codeBlock: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      }),
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder }),
      // Tables typed or pasted from Word / Excel / Google Docs / web pages stay tables.
      TableKit.configure({ table: { resizable: false } }),
    ],
    content: contentToHtml(value),
    onUpdate: ({ editor }) => {
      const html = editor.isEmpty ? '' : editor.getHTML();
      lastEmitted.current = html;
      onChange(html);
    },
  });

  // Load new content when the parent swaps the value (e.g. editing a different item).
  useEffect(() => {
    if (!editor || value === lastEmitted.current) return;
    lastEmitted.current = value;
    editor.commands.setContent(contentToHtml(value), { emitUpdate: false });
  }, [value, editor]);

  const toggleSource = () => {
    if (!editor) return;
    if (sourceMode) {
      const clean = sanitizeHtml(sourceHtml);
      editor.commands.setContent(clean, { emitUpdate: true });
    } else {
      setSourceHtml(editor.isEmpty ? '' : editor.getHTML());
    }
    setSourceMode(!sourceMode);
  };

  return (
    <div className="space-y-2">
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        {editor && (
          <Toolbar
            editor={editor}
            sourceMode={sourceMode}
            onToggleSource={toggleSource}
            onLink={() => setLinkOpen(true)}
            onImage={() => setImageOpen(true)}
          />
        )}
        {sourceMode ? (
          <Textarea
            id={id}
            value={sourceHtml}
            onChange={(e) => setSourceHtml(e.target.value)}
            className="rounded-none border-0 font-mono text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
            style={{ minHeight }}
          />
        ) : (
          <EditorContent
            id={id}
            editor={editor}
            className="rich-editor rich-content max-h-[60vh] overflow-y-auto"
            style={{ minHeight }}
          />
        )}
      </div>
      {editor && (
        <>
          <LinkDialog editor={editor} open={linkOpen} onOpenChange={setLinkOpen} />
          <ImageDialog editor={editor} open={imageOpen} onOpenChange={setImageOpen} bucket={imageBucket} fileBase={imageFileBase} />
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------- */

interface ToolbarProps {
  editor: Editor;
  sourceMode: boolean;
  onToggleSource: () => void;
  onLink: () => void;
  onImage: () => void;
}

function Toolbar({ editor, sourceMode, onToggleSource, onLink, onImage }: ToolbarProps) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      h4: e.isActive('heading', { level: 4 }),
      paragraph: e.isActive('paragraph'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      link: e.isActive('link'),
      image: e.isActive('image'),
      table: e.isActive('table'),
      headerRow: e.isActive('tableHeader'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const chain = () => editor.chain().focus();
  const disabled = sourceMode;

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-input bg-muted/50 p-1.5">
      <Group>
        <Tool title="Undo (Ctrl+Z)" disabled={disabled || !s.canUndo} onClick={() => chain().undo().run()} icon={Undo2} />
        <Tool title="Redo (Ctrl+Shift+Z)" disabled={disabled || !s.canRedo} onClick={() => chain().redo().run()} icon={Redo2} />
      </Group>
      <Group>
        <Tool title="Paragraph" active={s.paragraph} disabled={disabled} onClick={() => chain().setParagraph().run()} icon={Pilcrow} />
        <Tool title="Heading 2" active={s.h2} disabled={disabled} onClick={() => chain().toggleHeading({ level: 2 }).run()} icon={Heading2} />
        <Tool title="Heading 3" active={s.h3} disabled={disabled} onClick={() => chain().toggleHeading({ level: 3 }).run()} icon={Heading3} />
        <Tool title="Heading 4" active={s.h4} disabled={disabled} onClick={() => chain().toggleHeading({ level: 4 }).run()} icon={Heading4} />
      </Group>
      <Group>
        <Tool title="Bold (Ctrl+B)" active={s.bold} disabled={disabled} onClick={() => chain().toggleBold().run()} icon={Bold} />
        <Tool title="Italic (Ctrl+I)" active={s.italic} disabled={disabled} onClick={() => chain().toggleItalic().run()} icon={Italic} />
        <Tool title="Underline (Ctrl+U)" active={s.underline} disabled={disabled} onClick={() => chain().toggleUnderline().run()} icon={UnderlineIcon} />
        <Tool title="Strikethrough" active={s.strike} disabled={disabled} onClick={() => chain().toggleStrike().run()} icon={Strikethrough} />
      </Group>
      <Group>
        <Tool title="Bullet list" active={s.bullet} disabled={disabled} onClick={() => chain().toggleBulletList().run()} icon={List} />
        <Tool title="Numbered list" active={s.ordered} disabled={disabled} onClick={() => chain().toggleOrderedList().run()} icon={ListOrdered} />
        <Tool title="Quote" active={s.quote} disabled={disabled} onClick={() => chain().toggleBlockquote().run()} icon={Quote} />
        <Tool title="Divider" disabled={disabled} onClick={() => chain().setHorizontalRule().run()} icon={Minus} />
      </Group>
      <Group>
        <Tool title="Insert / edit link" active={s.link} disabled={disabled} onClick={onLink} icon={Link2} />
        <Tool title="Remove link" disabled={disabled || !s.link} onClick={() => chain().extendMarkRange('link').unsetLink().run()} icon={Unlink} />
        <Tool title={s.image ? 'Edit image / ALT text' : 'Insert image'} active={s.image} disabled={disabled} onClick={onImage} icon={ImagePlus} />
        <Tool title="Clear formatting" disabled={disabled} onClick={() => chain().unsetAllMarks().clearNodes().run()} icon={RemoveFormatting} />
      </Group>
      <Group>
        <Tool title="Insert table" active={s.table} disabled={disabled || s.table} onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} icon={Table2} />
        {s.table && (
          <>
            <Tool title="Add row below" disabled={disabled} onClick={() => chain().addRowAfter().run()} icon={BetweenHorizontalEnd} />
            <Tool title="Add column right" disabled={disabled} onClick={() => chain().addColumnAfter().run()} icon={BetweenVerticalEnd} />
            <Tool title="Delete row" disabled={disabled} onClick={() => chain().deleteRow().run()} icon={Rows3} />
            <Tool title="Delete column" disabled={disabled} onClick={() => chain().deleteColumn().run()} icon={Columns3} />
            <Tool title="Toggle header row" active={s.headerRow} disabled={disabled} onClick={() => chain().toggleHeaderRow().run()} icon={PanelTop} />
            <Tool title="Delete table" disabled={disabled} onClick={() => chain().deleteTable().run()} icon={Grid2x2X} />
          </>
        )}
      </Group>
      <div className="ml-auto">
        <Tool title={sourceMode ? 'Back to visual editor' : 'Edit HTML source'} active={sourceMode} onClick={onToggleSource} icon={Code2} />
      </div>
    </div>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5 border-r border-input pr-1 mr-1 last:border-r-0">{children}</div>;
}

function Tool({
  title, icon: Icon, onClick, active, disabled,
}: { title: string; icon: React.ComponentType<{ className?: string }>; onClick: () => void; active?: boolean; disabled?: boolean }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn('h-8 w-8 p-0', active && 'bg-primary/15 text-primary')}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}

/* ------------------------------------------------------------------------- */

interface LinkTarget { label: string; href: string; kind: string }

function LinkDialog({ editor, open, onOpenChange }: { editor: Editor; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [hasSelection, setHasSelection] = useState(false);

  useEffect(() => {
    if (!open) return;
    const { from, to } = editor.state.selection;
    const existing = editor.getAttributes('link').href as string | undefined;
    setUrl(existing || '');
    setText(editor.state.doc.textBetween(from, to, ' '));
    setHasSelection(from !== to || !!existing);
    setSearch('');
  }, [open, editor]);

  const { data: targets = [] } = useQuery({
    queryKey: ['rich-editor-link-targets'],
    enabled: open,
    staleTime: 60_000,
    queryFn: async (): Promise<LinkTarget[]> => {
      const [posts, products, services, categories] = await Promise.all([
        supabase.from('blog_posts').select('title, slug, id').eq('published', true),
        supabase.from('products').select('name, slug, id'),
        supabase.from('services').select('title, slug').eq('published', true),
        supabase.from('categories').select('name, slug'),
      ]);
      return [
        ...(posts.data || []).map((p) => ({ label: p.title, href: `/blog/${p.slug || p.id}`, kind: 'Blog' })),
        ...(products.data || []).map((p) => ({ label: p.name, href: `/products/${p.slug || p.id}`, kind: 'Product' })),
        ...(services.data || []).map((s) => ({ label: s.title, href: `/services/${s.slug}`, kind: 'Service' })),
        ...(categories.data || []).map((c) => ({ label: c.name, href: `/category/${c.slug}`, kind: 'Category' })),
      ];
    },
  });

  const filtered = targets.filter((t) => t.label.toLowerCase().includes(search.toLowerCase())).slice(0, 50);

  const apply = () => {
    const href = url.trim();
    if (!href) return;
    if (hasSelection) {
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    } else {
      const label = text.trim() || href;
      editor
        .chain()
        .focus()
        .insertContent({ type: 'text', text: label, marks: [{ type: 'link', attrs: { href } }] })
        .run();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Fits small screens (side margin, scrolls when taller than the screen). */}
      <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-lg">
        <DialogHeader>
          <DialogTitle>Insert link</DialogTitle>
        </DialogHeader>
        {/* min-w-0: a grid item otherwise grows to its widest content (long page titles) and spills out of the panel. */}
        <div className="min-w-0 space-y-4">
          {!hasSelection && (
            <div className="space-y-2">
              <Label htmlFor="rte-link-text">Text to display</Label>
              <Input id="rte-link-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Link text" />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="rte-link-url">URL</Label>
            <Input
              id="rte-link-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com or /products/slug"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rte-link-search">Or link to a page on this site</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input id="rte-link-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products, blog, services…" className="pl-9" />
            </div>
            {/* Native scrolling (not ScrollArea, whose inner table layout stretches to the longest title). */}
            <div data-link-results className="h-44 overflow-y-auto overflow-x-hidden rounded-md border p-1">
              {filtered.map((t) => (
                <button
                  key={t.href}
                  type="button"
                  title={t.label}
                  onClick={() => { setUrl(t.href); if (!text) setText(t.label); }}
                  className={cn(
                    'flex w-full min-w-0 items-center justify-between gap-3 rounded px-2 py-1.5 text-left text-sm hover:bg-accent',
                    url === t.href && 'bg-primary/10 text-primary',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{t.label}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{t.kind}</span>
                </button>
              ))}
              {filtered.length === 0 && <p className="p-2 text-sm text-muted-foreground">No matches</p>}
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={apply} disabled={!url.trim()}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------------- */

function ImageDialog({
  editor, open, onOpenChange, bucket, fileBase,
}: { editor: Editor; open: boolean; onOpenChange: (o: boolean) => void; bucket: ImageBucket; fileBase?: string }) {
  const [src, setSrc] = useState('');
  const [alt, setAlt] = useState('');
  const [decorative, setDecorative] = useState(false);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const isImage = editor.isActive('image');
    const attrs = isImage ? editor.getAttributes('image') : {};
    setEditing(isImage);
    setSrc((attrs.src as string) || '');
    setAlt((attrs.alt as string) || '');
    setDecorative(isImage && attrs.alt === '');
  }, [open, editor]);

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be less than 5MB'); return; }
    setUploading(true);
    try {
      setSrc(await uploadImage(bucket, file, { nameBase: fileBase, folder: 'content' }));
    } catch (error) {
      toast.error((error as Error).message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const altReady = decorative || !!alt.trim();
  const apply = () => {
    if (!src.trim() || !altReady) return;
    // Decorative images get alt="" so screen readers skip them.
    const attrs = decorative ? { src: src.trim(), alt: '', title: null } : { src: src.trim(), alt: alt.trim(), title: alt.trim() };
    if (editing) editor.chain().focus().updateAttributes('image', attrs).run();
    else editor.chain().focus().setImage(attrs).run();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit image' : 'Insert image'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {src && <img src={src} alt={alt || 'Preview'} className="max-h-40 w-full rounded border object-contain bg-muted" />}
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {uploading ? 'Uploading…' : 'Upload image'}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rte-img-src">Or image URL</Label>
            <Input id="rte-img-src" value={src} onChange={(e) => setSrc(e.target.value)} placeholder="https://…" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rte-img-alt">
              ALT text <span className="text-destructive">*</span>
            </Label>
            <Input id="rte-img-alt" value={decorative ? '' : alt} disabled={decorative} onChange={(e) => setAlt(e.target.value)} placeholder={decorative ? 'Decorative: no ALT text (alt="")' : 'Describe the image, e.g. Stryker 1007 stretcher side view'} />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox checked={decorative} onCheckedChange={(checked) => setDecorative(!!checked)} />
              Decorative image (adds no information, so screen readers skip it)
            </label>
            <p className="text-xs text-muted-foreground">Read by screen readers and used by Google Images.</p>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={apply} disabled={!src.trim() || !altReady || uploading}>
            {editing ? 'Update' : 'Insert'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
