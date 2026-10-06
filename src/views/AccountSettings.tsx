'use client';

import { useState, useEffect } from 'react';
import { useNavigate } from '@/lib/router';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Eye, EyeOff, User, Mail, Lock } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().trim().email({ message: "Invalid email address" }).max(255);
const passwordSchema = z.string().min(6, { message: "Password must be at least 6 characters" }).max(100);

export default function AccountSettings() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
    if (user) {
      setNewEmail(user.email || '');
      setFullName(user.user_metadata?.full_name || '');
    }
  }, [user, authLoading, navigate]);

  const getInitials = () => {
    if (fullName) {
      return fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = emailSchema.safeParse(newEmail);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    if (newEmail === user?.email) {
      toast.info('This is already your current email');
      return;
    }

    setEmailLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Confirmation email sent to your new address. Please check your inbox.');
      }
    } catch {
      toast.error('Failed to update email');
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = passwordSchema.safeParse(newPassword);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      toast.error('Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (authLoading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-2xl py-12">
        <div className="flex items-center gap-4 mb-8">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{fullName || 'Account Settings'}</h1>
            <p className="text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Change Email */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mail className="h-5 w-5 text-primary" />
                Change Email
              </CardTitle>
              <CardDescription>
                Update your email address. A confirmation will be sent to the new email.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEmailUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newEmail">Email Address</Label>
                  <Input
                    id="newEmail"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                  />
                </div>
                <Button type="submit" disabled={emailLoading} size="sm">
                  {emailLoading ? 'Updating...' : 'Update Email'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="h-5 w-5 text-primary" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your password to keep your account secure.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                  <Input
                    id="confirmNewPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-destructive">Passwords do not match</p>
                  )}
                </div>
                <Button type="submit" disabled={passwordLoading} size="sm">
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
