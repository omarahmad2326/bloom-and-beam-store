'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Download, Eye, Loader2, Mail, Plus, Search, Send, Trash2, UserMinus, UserPlus } from 'lucide-react';
import AdminLayout from './AdminLayout';
import RichTextEditor from '@/components/admin/RichTextEditor';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useContactInfo } from '@/hooks/useContactInfo';
import { SITE_URL } from '@/lib/site';
import { renderNewsletterEmail } from '@/lib/newsletterEmail';
import { subscribersCsv } from '@/lib/newsletterAdmin';
import type { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Campaign = Tables<'newsletter_campaigns'>;
type Subscriber = Tables<'newsletter_subscribers'>;

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Draft', variant: 'outline' },
  sending: { label: 'Sending…', variant: 'secondary' },
  sent: { label: 'Sent', variant: 'default' },
  failed: { label: 'Failed', variant: 'destructive' },
};

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) : '—';

async function callSend(body: Record<string, unknown>) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch('/api/admin/newsletter/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token ?? ''}` },
    body: JSON.stringify(body),
  }).catch(() => null);
  const json = await res?.json().catch(() => null);
  return { ok: !!res?.ok && !!json?.ok, error: json?.error as string | undefined, recipients: json?.recipients as number | undefined };
}

export default function AdminNewsletter() {
  const { isAdmin, user } = useAuth();
  const { contactInfo } = useContactInfo();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<Campaign | null>(null);
  const [subject, setSubject] = useState('');
  const [preheader, setPreheader] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);

  const [filter, setFilter] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    const [c, s] = await Promise.all([
      supabase.from('newsletter_campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('newsletter_subscribers').select('*').order('created_at', { ascending: false }),
    ]);
    if (c.error || s.error) toast.error('Failed to load the newsletter');
    setCampaigns(c.data || []);
    setSubscribers(s.data || []);
    setLoading(false);
    return c.data || [];
  };

  useEffect(() => {
    load();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (user?.email && !testEmail) setTestEmail(user.email);
  }, [user?.email]);

  // Follow a campaign while it is sending.
  useEffect(() => {
    const sending = campaigns.some((c) => c.status === 'sending');
    if (sending && !pollRef.current) {
      pollRef.current = setInterval(async () => {
        const fresh = await load();
        if (!fresh.some((c) => c.status === 'sending') && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }, 3000);
    }
  }, [campaigns]);

  const subscribedCount = subscribers.filter((s) => s.status === 'subscribed').length;
  const visibleSubscribers = subscribers.filter((s) => !filter.trim() || s.email.includes(filter.trim().toLowerCase()));
  const locked = !!editing && editing.status !== 'draft' && editing.status !== 'failed';

  const preview = useMemo(
    () =>
      renderNewsletterEmail({
        subject: subject || '(no subject)',
        preheader,
        contentHtml: content,
        unsubscribeUrl: `${SITE_URL}/newsletter/unsubscribe`,
        siteUrl: SITE_URL,
        addressLines: [contactInfo.address_line1, contactInfo.address_line2].filter(Boolean),
        phone: contactInfo.phone,
        email: contactInfo.email,
      }).html,
    [subject, preheader, content, contactInfo],
  );

  const openEditor = (c: Campaign | null) => {
    setConfirmSend(false);
    setEditing(c ?? ({ id: '', status: 'draft' } as Campaign));
    setSubject(c?.subject ?? '');
    setPreheader(c?.preheader ?? '');
    setContent(c?.content_html ?? '');
  };

  /** Saves the draft; returns its id. */
  const save = async (quiet = false): Promise<string | null> => {
    if (!editing || locked) return editing?.id || null;
    setSaving(true);
    const values = { subject: subject.trim(), preheader: preheader.trim() || null, content_html: content };
    const result = editing.id
      ? await supabase.from('newsletter_campaigns').update(values).eq('id', editing.id).select().single()
      : await supabase.from('newsletter_campaigns').insert(values).select().single();
    setSaving(false);
    if (result.error || !result.data) {
      toast.error('Failed to save the newsletter');
      return null;
    }
    setEditing(result.data);
    if (!quiet) toast.success('Draft saved');
    load();
    return result.data.id;
  };

  const sendTest = async () => {
    if (!testEmail.trim()) return;
    const id = await save(true);
    if (!id) return;
    setTesting(true);
    const r = await callSend({ campaignId: id, testEmail: testEmail.trim() });
    setTesting(false);
    if (r.ok) toast.success(`Test sent to ${testEmail.trim()}`);
    else toast.error(r.error || 'Could not send the test email');
  };

  const sendToAll = async () => {
    setSending(true);
    const id = await save(true);
    const r = id ? await callSend({ campaignId: id }) : { ok: false, error: undefined, recipients: 0 };
    setSending(false);
    setConfirmSend(false);
    if (!r.ok) {
      if (id) toast.error(r.error || 'Could not start sending');
      return;
    }
    toast.success(`Sending to ${r.recipients} subscriber${r.recipients === 1 ? '' : 's'}…`);
    setEditing(null);
    load();
  };

  const deleteCampaign = async (c: Campaign) => {
    setDeleteTarget(null);
    const { error } = await supabase.from('newsletter_campaigns').delete().eq('id', c.id);
    if (error) toast.error('Failed to delete');
    else {
      toast.success('Newsletter deleted. You can restore it from Recently Deleted for 7 days.');
      load();
    }
  };

  const addSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    const { error } = await supabase.from('newsletter_subscribers').insert({ email, source: 'added in dashboard' });
    if (error) {
      toast.error(error.code === '23505' ? 'This address is already on the list.' : error.code === '23514' ? 'Enter a valid email address.' : 'Failed to add subscriber');
      return;
    }
    toast.success(`${email} added`);
    setNewEmail('');
    load();
  };

  const setStatus = async (s: Subscriber, status: 'subscribed' | 'unsubscribed') => {
    const { error } = await supabase
      .from('newsletter_subscribers')
      .update({ status, unsubscribed_at: status === 'unsubscribed' ? new Date().toISOString() : null })
      .eq('id', s.id);
    if (error) toast.error('Failed to update subscriber');
    else load();
  };

  const removeSubscriber = async (s: Subscriber) => {
    if (!confirm(`Remove ${s.email}? You can restore it from Recently Deleted for 7 days.`)) return;
    const { error } = await supabase.from('newsletter_subscribers').delete().eq('id', s.id);
    if (error) toast.error('Failed to remove subscriber');
    else load();
  };

  const exportCsv = () => {
    const blob = new Blob([subscribersCsv(subscribers)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mrbedmed-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const resetStuck = async (c: Campaign) => {
    await supabase.from('newsletter_campaigns').update({ status: 'failed', last_error: 'Marked as failed by an admin (sending stopped).' }).eq('id', c.id);
    load();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Newsletter</h1>
            <p className="text-muted-foreground">
              {subscribedCount} subscriber{subscribedCount === 1 ? '' : 's'} · sign-ups come from the form in the website footer
            </p>
          </div>
          <Button onClick={() => openEditor(null)} disabled={!isAdmin}>
            <Plus className="h-4 w-4" /> New newsletter
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Tabs defaultValue="campaigns">
            <TabsList>
              <TabsTrigger value="campaigns">Newsletters</TabsTrigger>
              <TabsTrigger value="subscribers">Subscribers ({subscribedCount})</TabsTrigger>
            </TabsList>

            <TabsContent value="campaigns">
              <Card>
                <CardContent className="p-0">
                  {campaigns.length === 0 ? (
                    <p className="py-16 text-center text-muted-foreground">No newsletters yet. Click &ldquo;New newsletter&rdquo; to write the first one.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Subject</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Delivered</TableHead>
                            <TableHead>Sent</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {campaigns.map((c) => {
                            const badge = STATUS_BADGE[c.status] ?? STATUS_BADGE.draft;
                            const stuck = c.status === 'sending' && Date.now() - new Date(c.updated_at).getTime() > 15 * 60_000;
                            return (
                              <TableRow key={c.id}>
                                <TableCell className="max-w-xs font-medium">
                                  <button type="button" className="text-left hover:underline" onClick={() => openEditor(c)}>
                                    {c.subject || '(no subject)'}
                                  </button>
                                  {c.last_error && <span className="block text-xs text-destructive">{c.last_error}</span>}
                                </TableCell>
                                <TableCell><Badge variant={badge.variant}>{badge.label}</Badge></TableCell>
                                <TableCell className="whitespace-nowrap text-sm">
                                  {c.status === 'draft' ? '—' : `${c.sent_count} / ${c.recipient_count}`}
                                  {c.failed_count > 0 && <span className="block text-xs text-destructive">{c.failed_count} failed</span>}
                                </TableCell>
                                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(c.sent_at)}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    {stuck && <Button size="sm" variant="outline" onClick={() => resetStuck(c)}>Mark failed</Button>}
                                    <Button size="sm" variant="outline" onClick={() => openEditor(c)}>
                                      {c.status === 'draft' || c.status === 'failed' ? 'Edit' : 'View'}
                                    </Button>
                                    <Button size="icon" variant="ghost" disabled={!isAdmin || c.status === 'sending'} onClick={() => setDeleteTarget(c)} aria-label={`Delete ${c.subject}`}>
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="subscribers" className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search email" className="pl-9" aria-label="Search subscribers" />
                </div>
                <form onSubmit={addSubscriber} className="flex gap-2">
                  <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Add an email address" aria-label="Email address to add" className="md:w-64" />
                  <Button type="submit" variant="outline" disabled={!isAdmin || !newEmail.trim()}><UserPlus className="h-4 w-4" /> Add</Button>
                </form>
                <Button variant="outline" onClick={exportCsv} disabled={!subscribers.length}><Download className="h-4 w-4" /> Export CSV</Button>
              </div>
              <Card>
                <CardContent className="p-0">
                  {visibleSubscribers.length === 0 ? (
                    <p className="py-16 text-center text-muted-foreground">{subscribers.length ? 'No subscribers match your search.' : 'No subscribers yet.'}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Signed up</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {visibleSubscribers.map((s) => (
                            <TableRow key={s.id}>
                              <TableCell className="font-medium">{s.email}</TableCell>
                              <TableCell>
                                <Badge variant={s.status === 'subscribed' ? 'default' : 'outline'}>
                                  {s.status === 'subscribed' ? 'Subscribed' : 'Unsubscribed'}
                                </Badge>
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(s.created_at)}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{s.source || '—'}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  {s.status === 'subscribed' ? (
                                    <Button size="sm" variant="ghost" disabled={!isAdmin} onClick={() => setStatus(s, 'unsubscribed')}>
                                      <UserMinus className="h-4 w-4" /> Unsubscribe
                                    </Button>
                                  ) : (
                                    <Button size="sm" variant="ghost" disabled={!isAdmin} onClick={() => setStatus(s, 'subscribed')}>
                                      <UserPlus className="h-4 w-4" /> Resubscribe
                                    </Button>
                                  )}
                                  <Button size="icon" variant="ghost" disabled={!isAdmin} onClick={() => removeSubscriber(s)} aria-label={`Remove ${s.email}`}>
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
              <p className="text-xs text-muted-foreground">
                Only add people who asked to receive the newsletter. Every email includes an unsubscribe link, and unsubscribed
                addresses are never emailed.
              </p>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Editor */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{locked ? 'Sent newsletter' : editing?.id ? 'Edit newsletter' : 'New newsletter'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="nl-subject">Subject</Label>
              <Input id="nl-subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} disabled={locked} placeholder="e.g. New refurbished Stryker stretchers in stock" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nl-preheader">Preview text <span className="font-normal text-muted-foreground">(optional, shown after the subject in the inbox)</span></Label>
              <Input id="nl-preheader" value={preheader} onChange={(e) => setPreheader(e.target.value)} maxLength={150} disabled={locked} />
            </div>
            {locked ? (
              <iframe title="Newsletter" srcDoc={preview} className="h-[60vh] w-full rounded border" />
            ) : (
              <RichTextEditor label="Content" value={content} onChange={setContent} imageBucket="site-images" imageFileBase="newsletter" minHeight={320} />
            )}

            {!locked && (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Send</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@example.com" aria-label="Test email address" />
                    <Button variant="outline" onClick={sendTest} disabled={testing || !isAdmin || !testEmail.trim() || !subject.trim() || !content.trim()}>
                      {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Send test
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => setPreviewOpen(true)}><Eye className="h-4 w-4" /> Preview</Button>
                    <Button variant="outline" onClick={() => save()} disabled={saving || !isAdmin}>
                      {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save draft
                    </Button>
                    {!confirmSend && (
                      <Button onClick={() => setConfirmSend(true)} disabled={!isAdmin || !subject.trim() || !content.trim() || subscribedCount === 0}>
                        <Send className="h-4 w-4" /> Send to {subscribedCount} subscriber{subscribedCount === 1 ? '' : 's'}
                      </Button>
                    )}
                  </div>
                  {/* Confirmation inside the editor: a second modal closing together with this one leaves the
                      page unclickable (Radix Dialog bug), so no stacked AlertDialog here. */}
                  {confirmSend && (
                    <div role="alertdialog" aria-labelledby="nl-confirm-title" className="rounded-md border border-primary/30 bg-primary/5 p-4">
                      <p id="nl-confirm-title" className="font-semibold">Send to {subscribedCount} subscriber{subscribedCount === 1 ? '' : 's'} now?</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        &ldquo;{subject}&rdquo; will be emailed now. This cannot be undone. Send yourself a test first if you have not.
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Button onClick={sendToAll} disabled={sending}>
                          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send now
                        </Button>
                        <Button variant="outline" onClick={() => setConfirmSend(false)} disabled={sending}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Preview: {subject || '(no subject)'}</DialogTitle></DialogHeader>
          <iframe title="Newsletter preview" srcDoc={preview} className="h-[70vh] w-full rounded border" />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this newsletter?</AlertDialogTitle>
            <AlertDialogDescription>You can restore it from Recently Deleted for 7 days.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteTarget && deleteCampaign(deleteTarget)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
