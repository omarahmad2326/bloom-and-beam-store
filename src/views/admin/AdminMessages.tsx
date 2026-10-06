'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Eye, Trash2, Mail, MailOpen } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { useAuth } from '@/hooks/useAuth';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
  created_at: string;
}

export default function AdminMessages() {
  const { isAdmin } = useAuth();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch messages');
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  };

  const markAsRead = async (id: string, read: boolean) => {
    if (!isAdmin) return;

    const { error } = await supabase
      .from('contact_messages')
      .update({ read })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update message');
    } else {
      fetchMessages();
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      toast.error('You need admin privileges to delete messages');
      return;
    }

    if (!confirm('Are you sure you want to delete this message?')) return;

    const { error } = await supabase
      .from('contact_messages')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete message');
    } else {
      toast.success('Message deleted');
      fetchMessages();
    }
  };

  const viewMessage = async (msg: ContactMessage) => {
    setSelectedMessage(msg);
    setDialogOpen(true);
    if (!msg.read) {
      await markAsRead(msg.id, true);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const unreadCount = messages.filter(m => !m.read).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Messages</h1>
          <p className="text-muted-foreground">
            Contact form submissions {unreadCount > 0 && <span className="text-primary font-semibold">({unreadCount} unread)</span>}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : messages.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No messages yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {messages.map((msg) => (
              <Card key={msg.id} className={!msg.read ? 'border-primary/50 bg-primary/5' : ''}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {!msg.read && <span className="w-2 h-2 bg-primary rounded-full" />}
                      <h3 className="font-semibold">{msg.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{msg.email}</p>
                    <p className="font-medium mt-1 truncate">{msg.subject}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(msg.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => markAsRead(msg.id, !msg.read)}
                      title={msg.read ? 'Mark as unread' : 'Mark as read'}
                    >
                      {msg.read ? <MailOpen className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => viewMessage(msg)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(msg.id)} disabled={!isAdmin}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Message Details</DialogTitle>
            </DialogHeader>
            {selectedMessage && (
              <div className="space-y-4">
                <div>
                  <p><strong>From:</strong> {selectedMessage.name}</p>
                  <p><strong>Email:</strong> <a href={`mailto:${selectedMessage.email}`} className="text-primary hover:underline">{selectedMessage.email}</a></p>
                  <p><strong>Date:</strong> {formatDate(selectedMessage.created_at)}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Subject</h4>
                  <p>{selectedMessage.subject}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Message</h4>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{selectedMessage.message}</p>
                </div>
                <Button asChild className="w-full">
                  <a href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject}`}>Reply via Email</a>
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
