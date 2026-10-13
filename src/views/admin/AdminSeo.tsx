'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BadgeCheck, BarChart3, Bot, ChevronRight, Code2, ExternalLink, FileText, Loader2, Map as MapIcon, Plus, Trash2 } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { queries } from '@/queries';
import { SITE_URL } from '@/lib/site';
import type { Json } from '@/integrations/supabase/types';
import {
  SEO_SETTINGS_KEY, DEFAULT_SEO_SETTINGS, cleanClarityId, cleanGaId, cleanVerification, isValidClarityId, isValidGaId,
  isValidVerification, recommendedRobots, schemaBlockError, stripScriptTag, type SchemaBlock, type SeoSettings,
} from '@/lib/seoSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type Section = 'verification' | 'analytics' | 'robots' | 'llms' | 'schema';

function Pill({ ok, children }: { ok?: boolean; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', ok ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground')}>
      {children}
    </span>
  );
}

function SeoCard({
  icon: Icon, title, description, pills, link, onEdit, disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: ReactNode;
  pills: ReactNode;
  link?: string;
  onEdit?: () => void;
  disabled?: boolean;
}) {
  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col p-6">
        <div className="flex flex-1 gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            <div className="mt-3 flex flex-wrap gap-2">{pills}</div>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between gap-3 border-t pt-4">
          {link ? (
            <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
              {link} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ) : <span />}
          {onEdit && (
            <Button size="sm" onClick={onEdit} disabled={disabled}>
              Edit <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const newBlock = (n: number): SchemaBlock => ({ id: `block-${Date.now()}`, name: `Schema block ${n}`, enabled: true, json: '' });

export default function AdminSeo() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { data: saved, isLoading } = useQuery(queries.seoSettings());
  const settings = saved ?? DEFAULT_SEO_SETTINGS;

  const [section, setSection] = useState<Section | null>(null);
  const [draft, setDraft] = useState<SeoSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [sitemapCount, setSitemapCount] = useState<number | null>(null);
  const [llmsRecommended, setLlmsRecommended] = useState('');

  useEffect(() => {
    fetch('/sitemap.xml', { cache: 'no-store' })
      .then((r) => (r.ok ? r.text() : ''))
      .then((xml) => setSitemapCount((xml.match(/<url>/g) || []).length))
      .catch(() => setSitemapCount(null));
  }, []);

  const open = (s: Section) => {
    setDraft(structuredClone(settings));
    setSection(s);
    if (s === 'llms' && !llmsRecommended) {
      fetch('/llms.txt?view=recommended', { cache: 'no-store' }).then((r) => r.text()).then(setLlmsRecommended).catch(() => {});
    }
  };
  const set = <K extends keyof SeoSettings>(key: K, value: SeoSettings[K]) => setDraft((d) => ({ ...d, [key]: value }));

  // Validation for the open section.
  const google = cleanVerification(draft.google_verification);
  const bing = cleanVerification(draft.bing_verification);
  const ga = cleanGaId(draft.ga_id);
  const clarity = cleanClarityId(draft.clarity_id);
  const blockErrors = draft.schema_blocks.map((b) => (b.enabled || b.json.trim() ? schemaBlockError(b.json) : null));
  const errors: Partial<Record<string, string>> = {
    google: isValidVerification(google) ? undefined : 'Paste the code (or the whole meta tag) from Google Search Console.',
    bing: isValidVerification(bing) ? undefined : 'Paste the code (or the whole meta tag) from Bing Webmaster Tools.',
    ga: isValidGaId(ga) ? undefined : 'A Google Analytics 4 id looks like G-ABC123XYZ.',
    clarity: isValidClarityId(clarity) ? undefined : 'A Clarity project id looks like x8j4k2099m.',
    robots: draft.robots_mode === 'custom' && !draft.robots_custom.trim() ? 'Write your robots.txt or choose Recommended.' : undefined,
    llms: draft.llms_mode === 'custom' && !draft.llms_custom.trim() ? 'Write your llms.txt or choose Recommended.' : undefined,
  };
  const sectionErrors: Record<Section, boolean> = {
    verification: !!(errors.google || errors.bing),
    analytics: !!(errors.ga || errors.clarity),
    robots: !!errors.robots,
    llms: !!errors.llms,
    schema: blockErrors.some(Boolean) || draft.schema_blocks.some((b) => !b.name.trim()),
  };

  const save = async () => {
    if (!section || sectionErrors[section]) return;
    setSaving(true);
    const value: SeoSettings = {
      ...draft,
      google_verification: google,
      bing_verification: bing,
      ga_id: ga,
      clarity_id: clarity,
      schema_blocks: draft.schema_blocks
        .filter((b) => b.json.trim() || b.enabled)
        .map((b) => ({ ...b, name: b.name.trim(), json: stripScriptTag(b.json).trim() })),
    };
    const { error } = await supabase
      .from('site_settings')
      .upsert([{ key: SEO_SETTINGS_KEY, value: value as unknown as Json }], { onConflict: 'key' });
    setSaving(false);
    if (error) {
      toast.error('Failed to save. Please try again.');
      return;
    }
    queryClient.setQueryData(queries.seoSettings().queryKey, value);
    toast.success('Saved. The website uses it from the next page load.');
    setSection(null);
  };

  const activeBlocks = settings.schema_blocks.filter((b) => b.enabled && !schemaBlockError(b.json)).length;
  const sitemapUrl = '/sitemap.xml';

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">SEO &amp; Tracking</h1>
          <p className="max-w-3xl text-muted-foreground">
            Everything search engines, analytics and AI assistants read from the website. Changes go live as soon as you save.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <SeoCard
              icon={BadgeCheck}
              title="Search engine verification"
              description="Proves to Google Search Console and Bing Webmaster Tools that you own the site."
              pills={<>
                <Pill ok={!!settings.google_verification}>{settings.google_verification ? 'Google ✓' : 'Google not set'}</Pill>
                <Pill ok={!!settings.bing_verification}>{settings.bing_verification ? 'Bing ✓' : 'Bing not set'}</Pill>
              </>}
              onEdit={() => open('verification')}
              disabled={!isAdmin}
            />
            <SeoCard
              icon={BarChart3}
              title="Analytics & tracking"
              description="Google Analytics and Microsoft Clarity. They load on the public website only, never in the dashboard, so admin visits don't count as traffic."
              pills={<>
                <Pill ok={!!settings.ga_id}>{settings.ga_id ? `Analytics ${settings.ga_id}` : 'Analytics off'}</Pill>
                <Pill ok={!!settings.clarity_id}>{settings.clarity_id ? `Clarity ${settings.clarity_id}` : 'Clarity off'}</Pill>
              </>}
              onEdit={() => open('analytics')}
              disabled={!isAdmin}
            />
            <SeoCard
              icon={MapIcon}
              title="Sitemap (sitemap.xml)"
              description={<>Generated automatically from your published products, parts, services, categories, pages and blog posts, so it is always up to date. Submit <code>/sitemap.xml</code> in Google Search Console.</>}
              pills={<Pill ok={sitemapCount !== null}>{sitemapCount === null ? 'Checking…' : `On · ${sitemapCount} addresses`}</Pill>}
              link={sitemapUrl}
            />
            <SeoCard
              icon={FileText}
              title="robots.txt"
              description="Tells search engines what they may crawl. The recommended rules allow the whole website, keep the dashboard, sign-in, cart and account pages out, block AI-training crawlers and point to the sitemap."
              pills={<Pill ok>{settings.robots_mode === 'custom' ? 'Custom' : 'Recommended'}</Pill>}
              link="/robots.txt"
              onEdit={() => open('robots')}
              disabled={!isAdmin}
            />
            <SeoCard
              icon={Bot}
              title="llms.txt"
              description="A plain-text guide to the site for AI assistants (ChatGPT, Claude, Perplexity…). The recommended version is built automatically from your contact info, services, categories and latest posts."
              pills={<Pill ok>{settings.llms_mode === 'custom' ? 'Custom' : 'Recommended'}</Pill>}
              link="/llms.txt"
              onEdit={() => open('llms')}
              disabled={!isAdmin}
            />
            <SeoCard
              icon={Code2}
              title="Schema markup (JSON-LD)"
              description="Structured data for search engines. Site-wide blocks go on every page; products, parts, services, blog posts and pages also get their own automatic schema and a Custom schema box in their editors. Test with Google's Rich Results Test."
              pills={<Pill ok={activeBlocks > 0}>{activeBlocks > 0 ? `On · ${activeBlocks} block${activeBlocks === 1 ? '' : 's'}` : 'No site-wide blocks'}</Pill>}
              link="https://search.google.com/test/rich-results"
              onEdit={() => open('schema')}
              disabled={!isAdmin}
            />
          </div>
        )}
      </div>

      <Dialog open={!!section} onOpenChange={(o) => !o && setSection(null)}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-lg">
          {section === 'verification' && (
            <>
              <DialogHeader>
                <DialogTitle>Search engine verification</DialogTitle>
                <DialogDescription>Paste the code, or the whole &lt;meta&gt; tag, from each tool&apos;s &quot;HTML tag&quot; verification method. Leave empty to remove.</DialogDescription>
              </DialogHeader>
              <div className="min-w-0 space-y-4">
                <Field id="seo-google" label="Google Search Console" error={errors.google}
                  hint="Search Console → Settings → Ownership verification → HTML tag">
                  <Input id="seo-google" value={draft.google_verification} onChange={(e) => set('google_verification', e.target.value)} placeholder='<meta name="google-site-verification" content="…" />' />
                </Field>
                <Field id="seo-bing" label="Bing Webmaster Tools" error={errors.bing}
                  hint="Bing Webmaster Tools → Add site → HTML Meta Tag (or import the site from Google Search Console, then no code is needed)">
                  <Input id="seo-bing" value={draft.bing_verification} onChange={(e) => set('bing_verification', e.target.value)} placeholder='<meta name="msvalidate.01" content="…" />' />
                </Field>
              </div>
            </>
          )}

          {section === 'analytics' && (
            <>
              <DialogHeader>
                <DialogTitle>Analytics &amp; tracking</DialogTitle>
                <DialogDescription>Leave a field empty to turn that tool off.</DialogDescription>
              </DialogHeader>
              <div className="min-w-0 space-y-4">
                <Field id="seo-ga" label="Google Analytics 4 measurement id" error={errors.ga} hint="Google Analytics → Admin → Data streams → your website → Measurement ID">
                  <Input id="seo-ga" value={draft.ga_id} onChange={(e) => set('ga_id', e.target.value)} placeholder="G-XXXXXXXXXX" />
                </Field>
                <Field id="seo-clarity" label="Microsoft Clarity project id" error={errors.clarity} hint="Clarity → Settings → Overview → Project ID">
                  <Input id="seo-clarity" value={draft.clarity_id} onChange={(e) => set('clarity_id', e.target.value)} placeholder="x8j4k2099m" />
                </Field>
              </div>
            </>
          )}

          {(section === 'robots' || section === 'llms') && (() => {
            const isRobots = section === 'robots';
            const mode = isRobots ? draft.robots_mode : draft.llms_mode;
            const custom = isRobots ? draft.robots_custom : draft.llms_custom;
            const recommended = isRobots ? recommendedRobots(SITE_URL) : llmsRecommended;
            const setMode = (m: 'recommended' | 'custom') => set(isRobots ? 'robots_mode' : 'llms_mode', m);
            const setCustom = (v: string) => set(isRobots ? 'robots_custom' : 'llms_custom', v);
            return (
              <>
                <DialogHeader>
                  <DialogTitle>{isRobots ? 'robots.txt' : 'llms.txt'}</DialogTitle>
                  <DialogDescription>
                    {isRobots
                      ? 'Recommended keeps itself up to date. Choose Custom only if you need different rules.'
                      : 'Recommended updates itself whenever services, categories, posts or Contact Info change.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="min-w-0 space-y-4">
                  <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Version">
                    {(['recommended', 'custom'] as const).map((m) => (
                      <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)}
                        className={cn('rounded-md border p-3 text-left text-sm transition-colors', mode === m ? 'border-primary bg-primary/5' : 'hover:bg-accent')}>
                        <span className="font-semibold">{m === 'recommended' ? 'Recommended' : 'Custom'}</span>
                        <span className="block text-muted-foreground">{m === 'recommended' ? 'Built automatically' : 'Your own text'}</span>
                      </button>
                    ))}
                  </div>
                  {mode === 'custom' ? (
                    <Field id="seo-custom" label="Your text" error={isRobots ? errors.robots : errors.llms}>
                      <Textarea id="seo-custom" value={custom} onChange={(e) => setCustom(e.target.value)} rows={14} className="font-mono text-xs" spellCheck={false} />
                      <Button type="button" variant="outline" size="sm" className="mt-2" disabled={!recommended} onClick={() => setCustom(recommended)}>
                        Start from the recommended version
                      </Button>
                    </Field>
                  ) : (
                    <div className="space-y-2">
                      <Label>What the website serves</Label>
                      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-md border bg-muted p-3 font-mono text-xs">{recommended || 'Loading…'}</pre>
                    </div>
                  )}
                </div>
              </>
            );
          })()}

          {section === 'schema' && (
            <>
              <DialogHeader>
                <DialogTitle>Site-wide schema markup</DialogTitle>
                <DialogDescription>
                  Each enabled block is added to the &lt;head&gt; of every page. Paste a JSON-LD object (with or without the &lt;script&gt; tag). Invalid blocks are never published.
                </DialogDescription>
              </DialogHeader>
              <div className="min-w-0 space-y-4">
                {draft.schema_blocks.map((b, i) => (
                  <div key={b.id} className="space-y-2 rounded-md border p-3">
                    <div className="flex items-center gap-3">
                      <Input aria-label="Block name" value={b.name} onChange={(e) => set('schema_blocks', draft.schema_blocks.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className="h-9" />
                      <label className="flex shrink-0 items-center gap-2 text-sm">
                        <Switch checked={b.enabled} onCheckedChange={(on) => set('schema_blocks', draft.schema_blocks.map((x, j) => (j === i ? { ...x, enabled: on } : x)))} aria-label={`Publish ${b.name}`} />
                        On
                      </label>
                      <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${b.name}`} onClick={() => set('schema_blocks', draft.schema_blocks.filter((_, j) => j !== i))}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <Textarea aria-label={`${b.name} JSON-LD`} value={b.json} onChange={(e) => set('schema_blocks', draft.schema_blocks.map((x, j) => (j === i ? { ...x, json: e.target.value } : x)))} rows={10} className="font-mono text-xs" spellCheck={false} placeholder='{ "@context": "https://schema.org", "@type": "Organization", … }' />
                    {blockErrors[i] && <p className="text-xs text-destructive" role="alert">{blockErrors[i]}</p>}
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => set('schema_blocks', [...draft.schema_blocks, newBlock(draft.schema_blocks.length + 1)])}>
                  <Plus className="h-4 w-4" /> Add block
                </Button>
              </div>
            </>
          )}

          {section && (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setSection(null)}>Cancel</Button>
              <Button type="button" onClick={save} disabled={saving || !isAdmin || sectionErrors[section]}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive" role="alert">{error}</p> : hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
