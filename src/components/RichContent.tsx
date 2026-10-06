import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { renderableHtml } from '@/lib/content';
import { cn } from '@/lib/utils';

interface RichContentProps {
  content: string | null | undefined;
  className?: string;
}

/** Renders stored rich text (HTML, or legacy Markdown) safely, with in-app navigation for internal links. */
export default function RichContent({ content, className }: RichContentProps) {
  const navigate = useNavigate();
  const html = useMemo(() => renderableHtml(content), [content]);
  if (!html) return null;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const anchor = (e.target as HTMLElement).closest('a');
    const href = anchor?.getAttribute('href');
    if (!anchor || !href || anchor.target === '_blank') return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (href.startsWith('/') && !href.startsWith('//')) {
      e.preventDefault();
      navigate(href);
    }
  };

  return (
    <div
      className={cn('rich-content', className)}
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
