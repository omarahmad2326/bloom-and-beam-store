import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { ArrowRight, Plus, Search, Trash2 } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { normalizeRedirectPath } from '@/lib/redirects';
import type { Tables } from '@/integrations/supabase/types';

type Redirect = Tables<'redirects'>;

export default function AdminRedirects() {
  const { isAdmin } = useAuth();
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchRedirects();
  }, []);

  const fetchRedirects = async () => {
    const { data, error } = await supabase
      .from('redirects')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error('Failed to load redirects');
    else setRedirects(data || []);
    setLoading(false);
  };

  const fromPath = normalizeRedirectPath(fromInput);
  const toPath = normalizeRedirectPath(toInput, { allowExternal: true });
  const formError =
    fromInput && !fromPath ? 'Old URL must be a page on this site.' :
    toInput && !toPath ? 'New URL is not valid.' :
    fromPath && toPath && fromPath === toPath ? 'Old and new URL are the same.' :
    fromPath === '/' ? 'The home page cannot be redirected.' :
    null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !fromPath || !toPath || formError) return;

    setSaving(true);
    // A redirect chain (A → B → C) costs crawl budget; point existing redirects at the final URL.
    const { data: targetRedirect } = await supabase.from('redirects').select('to_path').eq('from_path', toPath).maybeSingle();
    const finalTo = targetRedirect?.to_path ?? toPath;
    if (finalTo === fromPath) {
      toast.error('This would create a redirect loop.');
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from('redirects')
      .insert([{ from_path: fromPath, to_path: finalTo, status_code: 301, source: 'manual' }]);

    if (!error) {
      await supabase.from('redirects').update({ to_path: finalTo }).eq('to_path', fromPath);
    }
    setSaving(false);

    if (error) {
      toast.error(error.code === '23505' ? `A redirect for ${fromPath} already exists.` : 'Failed to add redirect');
      return;
    }
    toast.success('Redirect added');
    setFromInput('');
    setToInput('');
    fetchRedirects();
  };

  const handleDelete = async (r: Redirect) => {
    if (!isAdmin) return;
    if (!confirm(`Delete the redirect from ${r.from_path}? Visitors to the old URL will get a 404.`)) return;
    const { error } = await supabase.from('redirects').delete().eq('id', r.id);
    if (error) toast.error('Failed to delete redirect');
    else {
      toast.success('Redirect deleted');
      fetchRedirects();
    }
  };

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? redirects.filter((r) => r.from_path.toLowerCase().includes(q) || r.to_path.toLowerCase().includes(q)) : redirects;
  }, [redirects, filter]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Redirects</h1>
          <p className="text-muted-foreground">
            Old URLs that 301-redirect to new ones. Redirects are added automatically when the slug of a published
            product, part, category, service or blog post changes.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add redirect</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto] md:items-end">
                <div className="space-y-2">
                  <Label htmlFor="from">Old URL</Label>
                  <Input id="from" value={fromInput} onChange={(e) => setFromInput(e.target.value)} placeholder="/old-page or https://mrbedmed.com/old-page" required />
                </div>
                <ArrowRight className="hidden md:block mb-3 h-4 w-4 text-muted-foreground" />
                <div className="space-y-2">
                  <Label htmlFor="to">New URL</Label>
                  <Input id="to" value={toInput} onChange={(e) => setToInput(e.target.value)} placeholder="/products/new-slug" required />
                </div>
                <Button type="submit" disabled={!isAdmin || saving || !fromPath || !toPath || !!formError}>
                  <Plus className="h-4 w-4 mr-2" /> {saving ? 'Adding…' : 'Add'}
                </Button>
              </div>
              {formError ? (
                <p className="text-sm text-destructive">{formError}</p>
              ) : fromPath && toPath ? (
                <p className="text-sm text-muted-foreground">
                  {fromPath} → {toPath} (301)
                </p>
              ) : null}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
            <CardTitle className="text-lg">All redirects ({redirects.length})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter…" className="pl-9" aria-label="Filter redirects" />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-6 text-center text-muted-foreground">Loading…</p>
            ) : visible.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">
                {redirects.length === 0 ? 'No redirects yet.' : 'No redirects match the filter.'}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Old URL</TableHead>
                    <TableHead>New URL</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs break-all">{r.from_path}</TableCell>
                      <TableCell className="font-mono text-xs break-all">
                        <a href={r.to_path} target="_blank" rel="noreferrer" className="hover:text-primary hover:underline">{r.to_path}</a>
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.source === 'auto' ? 'secondary' : 'outline'}>
                          {r.status_code} · {r.source === 'auto' ? 'Automatic' : 'Manual'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(r.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(r)} disabled={!isAdmin} aria-label={`Delete redirect from ${r.from_path}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
