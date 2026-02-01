import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Database, Shield, Mail, Cloud, CreditCard, RefreshCw, AlertCircle, CheckCircle2, Key } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';

export const AdminSettings = () => {
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillResult, setBackfillResult] = useState<any>(null);
  const [sendingEmails, setSendingEmails] = useState(false);
  
  // Password management state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in both password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      toast.success('Password updated successfully');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error('Failed to update password: ' + error.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const runBackfillDryRun = async () => {
    setBackfillLoading(true);
    setBackfillResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('backfill-subscription-notifications', {
        body: { since: '2026-01-27', dryRun: true, sendEmails: false },
      });
      if (error) throw error;
      setBackfillResult(data);
      toast.success('Dry run complete - see results below');
    } catch (error: any) {
      toast.error('Backfill failed: ' + error.message);
    } finally {
      setBackfillLoading(false);
    }
  };

  const runBackfillSendEmails = async () => {
    if (!window.confirm('This will send emails to all customers who missed notifications since Jan 27, 2026. Are you sure?')) {
      return;
    }
    setSendingEmails(true);
    try {
      const { data, error } = await supabase.functions.invoke('backfill-subscription-notifications', {
        body: { since: '2026-01-27', dryRun: false, sendEmails: true },
      });
      if (error) throw error;
      setBackfillResult(data);
      toast.success(`Sent ${data.checkoutSessions.emailsSent + data.subscriptions.emailsSent} backfill emails`);
    } catch (error: any) {
      toast.error('Backfill failed: ' + error.message);
    } finally {
      setSendingEmails(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold mb-2">System Settings</h1>
            <p className="text-muted-foreground">Configure platform settings and preferences</p>
          </div>
        </div>

        <div className="grid gap-6 max-w-4xl">
          {/* Stripe Webhook Recovery Card - NEW */}
          <Card className="border-amber-500/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-amber-500" />
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Stripe Webhook Recovery
                    <Badge variant="default" className="bg-amber-500">Action Required</Badge>
                  </CardTitle>
                  <CardDescription>
                    Backfill missed subscription notifications from Jan 27, 2026
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    <p className="font-medium">Webhook Issue Fixed</p>
                    <p className="text-amber-700 dark:text-amber-300">
                      The Stripe webhook was timing out due to synchronous processing. This has been fixed with async event handling.
                      Use the buttons below to send missed confirmation emails.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={runBackfillDryRun}
                  disabled={backfillLoading || sendingEmails}
                >
                  {backfillLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Preview (Dry Run)
                </Button>
                <Button 
                  variant="default"
                  onClick={runBackfillSendEmails}
                  disabled={backfillLoading || sendingEmails}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {sendingEmails ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  Send Missed Notifications
                </Button>
              </div>

              {backfillResult && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="font-medium">
                      {backfillResult.dryRun ? 'Dry Run Results' : 'Backfill Complete'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Checkout Sessions</p>
                      <p className="font-medium">{backfillResult.checkoutSessions.total} found</p>
                      {!backfillResult.dryRun && (
                        <p className="text-green-600">{backfillResult.checkoutSessions.emailsSent} emails sent</p>
                      )}
                    </div>
                    <div>
                      <p className="text-muted-foreground">Subscriptions</p>
                      <p className="font-medium">{backfillResult.subscriptions.total} found</p>
                      {!backfillResult.dryRun && (
                        <p className="text-green-600">{backfillResult.subscriptions.emailsSent} emails sent</p>
                      )}
                    </div>
                  </div>
                  {backfillResult.checkoutSessions.data?.length > 0 && (
                    <div className="mt-3 max-h-40 overflow-y-auto">
                      <p className="text-xs text-muted-foreground mb-1">Recent Sessions:</p>
                      {backfillResult.checkoutSessions.data.slice(0, 5).map((s: any) => (
                        <div key={s.sessionId} className="text-xs py-1 border-b border-border">
                          {s.customerEmail} - ${s.amount} ({s.mode})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>Database Management</CardTitle>
                  <CardDescription>View and manage database tables and records</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Access the backend database to view tables, manage data, and configure database settings.
              </p>
              <Button variant="outline" disabled>
                Open Backend
              </Button>
            </CardContent>
          </Card>

          {/* Admin Password Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Key className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>Password Management</CardTitle>
                  <CardDescription>Update your admin account password</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <PasswordInput
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  showStrength
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <PasswordInput
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              <Button 
                onClick={handlePasswordChange}
                disabled={passwordLoading || !newPassword || !confirmPassword}
              >
                {passwordLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Update Password
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>Configure authentication and security policies</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Row-Level Security</p>
                    <p className="text-sm text-muted-foreground">All tables have RLS enabled</p>
                  </div>
                  <Badge variant="default" className="bg-green-500">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Auto-Confirm</p>
                    <p className="text-sm text-muted-foreground">New users are auto-confirmed</p>
                  </div>
                  <Badge variant="default" className="bg-green-500">Enabled</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>Email Configuration</CardTitle>
                  <CardDescription>Manage email templates and automation settings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Configure email templates, automation rules, and notification settings for the platform.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" disabled>
                  Email Templates
                </Button>
                <Button variant="outline" disabled>
                  Automation Rules
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Coming soon</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Cloud className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>Platform Information</CardTitle>
                  <CardDescription>System status and configuration details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Platform Status</span>
                  <Badge variant="default" className="bg-green-500">Operational</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Stripe Webhook</span>
                  <Badge variant="default" className="bg-green-500">Fixed (Async)</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Backend</span>
                  <span className="text-sm font-medium">ACFE Cloud</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Environment</span>
                  <span className="text-sm font-medium">Production</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

function Badge({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className || ''}`}>
      {children}
    </span>
  );
}
