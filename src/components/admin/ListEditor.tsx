import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ListEditorProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  id?: string;
  help?: string;
}

/** Editable list of short text items (features, benefits, cities…). */
export default function ListEditor({ label, items, onChange, placeholder = 'Add an item', id, help }: ListEditorProps) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const value = draft.trim();
    if (!value) return;
    onChange([...items, value]);
    setDraft('');
  };
  const update = (i: number, value: string) => onChange(items.map((it, idx) => (idx === i ? value : it)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {items.length > 0 && (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-1">
              <Input value={item} onChange={(e) => update(i, e.target.value)} aria-label={`${label} item ${i + 1}`} />
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down">
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => remove(i)} aria-label="Remove">
                <X className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" onClick={add} disabled={!draft.trim()}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}

/** Trim and drop empty entries before saving. */
export const cleanList = (items: string[]) => items.map((s) => s.trim()).filter(Boolean);
