import { JsonLd } from './JsonLd';
import { breadcrumbSchema, type Crumb } from '@/lib/schema';

/** BreadcrumbList for inner pages. Pass the trail after "Home". */
export function BreadcrumbSchema({ items }: { items: Crumb[] }) {
  return <JsonLd id="breadcrumb" data={breadcrumbSchema(items)} />;
}
