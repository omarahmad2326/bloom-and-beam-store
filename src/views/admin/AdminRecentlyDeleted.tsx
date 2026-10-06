'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, RotateCcw, Search, Trash2 } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DELETED_TYPES, RETENTION_DAYS, timeLeft } from '@/lib/recentlyDeleted';

type DeletedItem = {
  id: number;
  table_name: string;
  row_id: string;
  label: string | null;
  deleted_at: string;
  deleted_by_email: string | null;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' });

export default function AdminRecentlyDeleted() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<DeletedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [filter, setFilter] = useState('');
  const [type, setType] = useState('all');
  const [purgeTarget, setPurgeTarget] = useState<DeletedItem | null>(null);

  const load = async () => {
    const { data, error } = await supabase.rpc('list_deleted_items');
    if (error) toast.error('Failed to load recently deleted items');
    else setItems((data || []) as DeletedItem[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const types = useMemo(() => [...new Set(items.map((i) => i.table_name))], [items]);
  const visible = items.filter(
    (i) =>
      (type === 'all' || i.table_name === type) &&
      (!filter.trim() || (i.label || '').toLowerCase().includes(filter.trim().toLowerCase())),
  );

  const restore = async (item: DeletedItem) => {
    setBusyId(item.id);
    const { error } = await supabase.rpc('restore_deleted_item', { p_id: item.id });
    setBusyId(null);
    if (error) {
      toast.error(error.message || 'Could not restore this item');
      return;
    }
    const kind = DELETED_TYPES[item.table_name];
    toast.success(`Restored ${kind?.label.toLowerCase() || 'item'} "${item.label}"`, {
      action: kind ? { label: 'Open', onClick: () => (window.location.href = kind.path) } : undefined,
    });
    queryClient.invalidateQueries();
    load();
  };

  const purge = async (item: DeletedItem) => {
    setBusyId(item.id);
    const { error } = await supabase.rpc('purge_deleted_item', { p_id: item.id });
    setBusyId(null);
    setPurgeTarget(null);
    if (error) {
      toast.error('Could not delete this item permanently');
      return;
    }
    toast.success('Deleted permanently');
    load();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Recently Deleted</h1>
          <p className="text-muted-foreground">
            Anything deleted in the dashboard stays here for {RETENTION_DAYS} days and can be restored with its URL, images
            and settings. After {RETENTION_DAYS} days it is removed permanently.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search by name" className="pl-9" aria-label="Search deleted items" />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="sm:w-48" aria-label="Filter by type"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {types.map((t) => (
                <SelectItem key={t} value={t}>{DELETED_TYPES[t]?.label || t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : visible.length === 0 ? (
              <p className="py-16 text-center text-muted-foreground">
                {items.length === 0 ? `Nothing was deleted in the last ${RETENTION_DAYS} days.` : 'No deleted items match your search.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Deleted</TableHead>
                      <TableHead>Kept for</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="max-w-xs font-medium"><span className="line-clamp-2">{item.label || '(no name)'}</span></TableCell>
                        <TableCell><Badge variant="secondary">{DELETED_TYPES[item.table_name]?.label || item.table_name}</Badge></TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {formatDate(item.deleted_at)}
                          {item.deleted_by_email && <span className="block text-xs">by {item.deleted_by_email}</span>}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{timeLeft(item.deleted_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" onClick={() => restore(item)} disabled={!isAdmin || busyId === item.id}>
                              {busyId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                              Restore
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setPurgeTarget(item)}
                              disabled={!isAdmin || busyId === item.id}
                              aria-label={`Delete ${item.label} permanently`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!purgeTarget} onOpenChange={(open) => !open && setPurgeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{purgeTarget?.label}&rdquo; will be removed for good and can no longer be restored.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => purgeTarget && purge(purgeTarget)}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
