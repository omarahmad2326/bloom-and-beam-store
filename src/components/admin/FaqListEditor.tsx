import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface FaqItem {
  question: string;
  answer: string;
}

interface FaqListEditorProps {
  items: FaqItem[];
  onChange: (items: FaqItem[]) => void;
  label?: string;
}

export default function FaqListEditor({ items, onChange, label = 'FAQs' }: FaqListEditorProps) {
  const update = (i: number, patch: Partial<FaqItem>) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {items.map((item, i) => (
        <div key={i} className="space-y-2 rounded-md border p-3">
          <div className="flex items-center gap-2">
            <Input
              value={item.question}
              onChange={(e) => update(i, { question: e.target.value })}
              placeholder="Question"
              aria-label={`Question ${i + 1}`}
            />
            <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => onChange(items.filter((_, idx) => idx !== i))} aria-label="Remove FAQ">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          <Textarea
            value={item.answer}
            onChange={(e) => update(i, { answer: e.target.value })}
            placeholder="Answer"
            rows={2}
            aria-label={`Answer ${i + 1}`}
          />
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, { question: '', answer: '' }])}>
        <Plus className="h-4 w-4 mr-1" /> Add FAQ
      </Button>
    </div>
  );
}

export const cleanFaqs = (items: FaqItem[]) =>
  items
    .map((f) => ({ question: f.question.trim(), answer: f.answer.trim() }))
    .filter((f) => f.question && f.answer);
