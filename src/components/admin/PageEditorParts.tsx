import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/** Building blocks shared by the section-based page editors (About, Contact). */

export function moveItem<T>(items: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= items.length) return items;
  const next = [...items];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function RowControls({ index, count, onMove, onRemove, label }: {
  index: number; count: number; onMove: (dir: -1 | 1) => void; onRemove: () => void; label: string;
}) {
  return (
    <div className="flex shrink-0 gap-1">
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={index === 0} onClick={() => onMove(-1)} aria-label={`Move ${label} up`}>
        <ArrowUp className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={index === count - 1} onClick={() => onMove(1)} aria-label={`Move ${label} down`}>
        <ArrowDown className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove} aria-label={`Remove ${label}`}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

export function Section({ n, title, children, hint }: { n: number; title: string; children: React.ReactNode; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{n}. {title}</CardTitle>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export function TitleField({ id, value, onChange, label = 'Section title (H2)' }: {
  id: string; value: string; onChange: (v: string) => void; label?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
