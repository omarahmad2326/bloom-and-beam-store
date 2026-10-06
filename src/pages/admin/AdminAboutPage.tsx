import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2, Plus, Save, AlertTriangle } from 'lucide-react';
import { moveItem as move, RowControls, Section, TitleField } from '@/components/admin/PageEditorParts';
import { toast } from 'sonner';
import AdminLayout from './AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RichTextEditor from '@/components/admin/RichTextEditor';
import ListEditor, { cleanList } from '@/components/admin/ListEditor';
import ImageUpload from '@/components/admin/ImageUpload';
import SeoFields, { customSchemaError } from '@/components/admin/SeoFields';
import {
  ABOUT_ICONS, ABOUT_SETTINGS_KEY, DEFAULT_ABOUT, aboutWordCount, withAboutDefaults,
  type AboutCard, type AboutPageContent, type AboutStat, type AboutTeamMember,
} from '@/lib/aboutPage';

const WORD_TARGET = 700;

function CardsEditor({ cards, onChange, withLinks, addLabel }: {
  cards: AboutCard[]; onChange: (cards: AboutCard[]) => void; withLinks: boolean; addLabel: string;
}) {
  const update = (i: number, patch: Partial<AboutCard>) => onChange(cards.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  return (
    <div className="space-y-3">
      {cards.map((card, i) => {
        const Icon = ABOUT_ICONS[card.icon] ?? ABOUT_ICONS.BadgeCheck;
        return (
          <div key={i} className="space-y-3 rounded-lg border p-3">
            <div className="flex items-start gap-2">
              <div className="grid flex-1 gap-3 sm:grid-cols-[11rem_1fr]">
                <Select value={card.icon} onValueChange={(icon) => update(i, { icon })}>
                  <SelectTrigger aria-label="Icon">
                    <span className="flex items-center gap-2"><Icon className="h-4 w-4 text-primary" /><SelectValue /></span>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ABOUT_ICONS).map(([name, I]) => (
                      <SelectItem key={name} value={name}>
                        <span className="flex items-center gap-2"><I className="h-4 w-4" />{name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input value={card.title} onChange={(e) => update(i, { title: e.target.value })} placeholder="Card title" aria-label="Card title" />
              </div>
              <RowControls index={i} count={cards.length} label={card.title || 'card'} onMove={(d) => onChange(move(cards, i, d))} onRemove={() => onChange(cards.filter((_, idx) => idx !== i))} />
            </div>
            <Textarea value={card.text} onChange={(e) => update(i, { text: e.target.value })} rows={2} placeholder="Short description" aria-label="Card description" />
            {withLinks && (
              <div className="flex items-center gap-2">
                <Input value={card.link} onChange={(e) => update(i, { link: e.target.value })} placeholder="Link, e.g. /services/equipment-rental (leave empty for no link)" aria-label="Card link" />
                {card.link && (
                  <a href={card.link} target="_blank" rel="noreferrer" className="shrink-0 text-muted-foreground hover:text-primary" aria-label="Open link">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}
          </div>
        );
      })}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...cards, { icon: 'BadgeCheck', title: '', text: '', link: '' }])}>
        <Plus className="mr-1 h-4 w-4" /> {addLabel}
      </Button>
    </div>
  );
}

function StatsEditor({ stats, onChange }: { stats: AboutStat[]; onChange: (s: AboutStat[]) => void }) {
  const update = (i: number, patch: Partial<AboutStat>) => onChange(stats.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  return (
    <div className="space-y-3">
      <p className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        Only add numbers the owner has confirmed are true. The stats row is hidden while this list is empty.
      </p>
      {stats.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input className="w-32" value={s.value} onChange={(e) => update(i, { value: e.target.value })} placeholder="e.g. 20+" aria-label="Stat value" />
          <Input value={s.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="e.g. Years in business" aria-label="Stat label" />
          <RowControls index={i} count={stats.length} label="stat" onMove={(d) => onChange(move(stats, i, d))} onRemove={() => onChange(stats.filter((_, idx) => idx !== i))} />
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...stats, { value: '', label: '' }])}>
        <Plus className="mr-1 h-4 w-4" /> Add stat
      </Button>
    </div>
  );
}

function TeamEditor({ team, onChange }: { team: AboutTeamMember[]; onChange: (t: AboutTeamMember[]) => void }) {
  const update = (i: number, patch: Partial<AboutTeamMember>) => onChange(team.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  return (
    <div className="space-y-3">
      {team.map((m, i) => (
        <div key={i} className="rounded-lg border p-3">
          <div className="mb-3 flex items-start gap-2">
            <div className="grid flex-1 gap-3 sm:grid-cols-3">
              <Input value={m.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="Name" aria-label="Name" />
              <Input value={m.role} onChange={(e) => update(i, { role: e.target.value })} placeholder="Role" aria-label="Role" />
              <Input value={m.years} onChange={(e) => update(i, { years: e.target.value })} placeholder="e.g. 15 years of experience" aria-label="Experience" />
            </div>
            <RowControls index={i} count={team.length} label={m.name || 'team member'} onMove={(d) => onChange(move(team, i, d))} onRemove={() => onChange(team.filter((_, idx) => idx !== i))} />
          </div>
          <ImageUpload
            bucket="site-images"
            currentUrl={m.photo_url}
            onImageChange={(photo_url) => update(i, { photo_url })}
            alt={m.photo_alt}
            onAltChange={(photo_alt) => update(i, { photo_alt })}
            label="Photo"
          />
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...team, { name: '', role: '', years: '', photo_url: '', photo_alt: '' }])}>
        <Plus className="mr-1 h-4 w-4" /> Add team member
      </Button>
    </div>
  );
}

export default function AdminAboutPage() {
  const { isAdmin } = useAuth();
  const [content, setContent] = useState<AboutPageContent>(DEFAULT_ABOUT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<AboutPageContent>) => setContent((c) => ({ ...c, ...patch }));

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('site_settings').select('value').eq('key', ABOUT_SETTINGS_KEY).maybeSingle();
      if (error) toast.error('Failed to load the About page');
      setContent(withAboutDefaults(data?.value));
      setLoading(false);
    })();
  }, []);

  const wordCount = useMemo(() => aboutWordCount(content), [content]);

  const save = async () => {
    if (!isAdmin) {
      toast.error('Admin privileges required');
      return;
    }
    const schemaError = customSchemaError(content.custom_schema);
    if (schemaError) {
      toast.error(`Custom schema: ${schemaError}`);
      return;
    }
    const clean: AboutPageContent = {
      ...content,
      cities: cleanList(content.cities),
      what_cards: content.what_cards.filter((c) => c.title.trim()),
      why_cards: content.why_cards.filter((c) => c.title.trim()),
      stats: content.stats.filter((s) => s.value.trim() && s.label.trim()),
      team: content.team.filter((m) => m.name.trim()),
    };
    setSaving(true);
    const { error } = await supabase
      .from('site_settings')
      .upsert([{ key: ABOUT_SETTINGS_KEY, value: clean as unknown as Json }], { onConflict: 'key' });
    setSaving(false);
    if (error) {
      toast.error('Failed to save the About page');
      return;
    }
    setContent(clean);
    toast.success('About page saved');
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="sticky top-0 z-10 -mx-2 flex flex-wrap items-center justify-between gap-3 bg-muted/80 px-2 py-3 backdrop-blur">
          <div>
            <h1 className="text-3xl font-bold">About Page</h1>
            <p className="text-sm text-muted-foreground">
              Empty sections are hidden on the site.{' '}
              <span className={wordCount >= WORD_TARGET ? 'font-medium text-green-700' : 'font-medium text-amber-700'}>
                ~{wordCount} words{wordCount < WORD_TARGET ? ` (target ${WORD_TARGET}+)` : ''}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <a href="/about-us" target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" /> View page</a>
            </Button>
            <Button onClick={save} disabled={saving || !isAdmin}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
            </Button>
          </div>
        </div>

        <Section n={1} title="Page heading (H1)">
          <div className="space-y-2">
            <Label htmlFor="h1">H1</Label>
            <Input id="h1" value={content.h1} onChange={(e) => set({ h1: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="intro">Intro line under the heading (optional)</Label>
            <Textarea id="intro" value={content.intro} onChange={(e) => set({ intro: e.target.value })} rows={2} />
          </div>
        </Section>

        <Section n={2} title="Who We Are">
          <TitleField id="who_title" value={content.who_title} onChange={(who_title) => set({ who_title })} />
          <RichTextEditor label="Text" value={content.who_html} onChange={(who_html) => set({ who_html })} imageBucket="site-images" minHeight={160} />
          <div className="space-y-2">
            <Label htmlFor="founding_story">Founding story line</Label>
            <Textarea id="founding_story" value={content.founding_story} onChange={(e) => set({ founding_story: e.target.value })} rows={2} placeholder="Leave empty until the owner sends it. It is not shown while empty." />
          </div>
        </Section>

        <Section n={3} title="Our Mission">
          <TitleField id="mission_title" value={content.mission_title} onChange={(mission_title) => set({ mission_title })} />
          <RichTextEditor label="Text" value={content.mission_html} onChange={(mission_html) => set({ mission_html })} imageBucket="site-images" minHeight={120} />
        </Section>

        <Section n={4} title="What We Do" hint="Each card links to its page.">
          <TitleField id="what_title" value={content.what_title} onChange={(what_title) => set({ what_title })} />
          <CardsEditor cards={content.what_cards} onChange={(what_cards) => set({ what_cards })} withLinks addLabel="Add service card" />
        </Section>

        <Section n={5} title="Why Healthcare Facilities Choose Mrbedmed">
          <TitleField id="why_title" value={content.why_title} onChange={(why_title) => set({ why_title })} />
          <CardsEditor cards={content.why_cards} onChange={(why_cards) => set({ why_cards })} withLinks={false} addLabel="Add reason card" />
        </Section>

        <Section n={6} title="Stats row">
          <StatsEditor stats={content.stats} onChange={(stats) => set({ stats })} />
        </Section>

        <Section n={7} title="Our Team">
          <TitleField id="team_title" value={content.team_title} onChange={(team_title) => set({ team_title })} />
          <TeamEditor team={content.team} onChange={(team) => set({ team })} />
        </Section>

        <Section n={8} title="Service area">
          <TitleField id="areas_title" value={content.areas_title} onChange={(areas_title) => set({ areas_title })} />
          <RichTextEditor label="Text (optional)" value={content.areas_html} onChange={(areas_html) => set({ areas_html })} imageBucket="site-images" minHeight={100} />
          <ListEditor id="cities" label="Cities" items={content.cities} onChange={(cities) => set({ cities })} placeholder="e.g. Houston" />
        </Section>

        <Section n={9} title="Get in Touch" hint="The Get a Quote button, phone and email (from Contact Info) are always shown.">
          <TitleField id="contact_title" value={content.contact_title} onChange={(contact_title) => set({ contact_title })} />
          <div className="space-y-2">
            <Label htmlFor="contact_text">Text (optional)</Label>
            <Textarea id="contact_text" value={content.contact_text} onChange={(e) => set({ contact_text: e.target.value })} rows={2} />
          </div>
        </Section>

        <SeoFields
          values={content}
          onChange={set}
          path="/about-us"
          fallbackTitle={DEFAULT_ABOUT.meta_title}
          fallbackDescription={DEFAULT_ABOUT.meta_description}
        />

        <div className="flex justify-end pb-8">
          <Button onClick={save} disabled={saving || !isAdmin}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save About page
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
