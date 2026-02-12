import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';
import { Loader2, Send, Eye, ArrowLeft, Users, Filter, Radio, History, Save, Trash2, FileText } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { buildCanonicalEmail, EmailContentSlots } from '../../supabase/functions/_shared/email-template';
import { COUNTRIES } from '@/data/countries';
import { format, formatDistanceToNow } from 'date-fns';
import { useBroadcastDraft } from '@/hooks/useBroadcastDraft';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface Recipient {
  id: string;
  email: string;
  full_name: string;
  country: string | null;
  preferred_language: string | null;
  gender: string | null;
  skills: string[] | null;
}

interface Broadcast {
  id: string;
  subject: string;
  content: string;
  target_role: string;
  filters: unknown;
  recipient_count: number;
  created_at: string;
}

const DEFAULT_CONTENT = '<p>Dear {{first_name}},</p><p>Your message here...</p>';

export const AdminBroadcasts = () => {
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [sending, setSending] = useState(false);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Filters
  const [targetRole, setTargetRole] = useState<string>('all');
  const [filterCountry, setFilterCountry] = useState<string>('');
  const [filterLanguage, setFilterLanguage] = useState<string>('');
  const [filterGender, setFilterGender] = useState<string>('');
  const [filterSkills, setFilterSkills] = useState<string>('');

  // Recipients
  const [recipients, setRecipients] = useState<Recipient[]>([]);

  // Email content
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState(DEFAULT_CONTENT);

  // History
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Template save dialog
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Draft & templates hook
  const {
    lastSaved,
    saving: savingDraft,
    loadDraft,
    clearDraft,
    startAutoSave,
    stopAutoSave,
    templates,
    loadTemplates,
    saveTemplate,
    deleteTemplate,
  } = useBroadcastDraft(profile?.id);

  // Get current state for auto-save
  const getCurrentState = useCallback(() => ({
    subject,
    content,
    targetRole,
    filters: {
      country: filterCountry,
      language: filterLanguage,
      gender: filterGender,
      skills: filterSkills,
    },
  }), [subject, content, targetRole, filterCountry, filterLanguage, filterGender, filterSkills]);

  // Load draft on mount
  useEffect(() => {
    if (!profile?.id) return;
    loadDraft().then(draft => {
      if (draft) {
        setSubject(draft.subject);
        setContent(draft.content);
        setTargetRole(draft.targetRole);
        setFilterCountry(draft.filters.country);
        setFilterLanguage(draft.filters.language);
        setFilterGender(draft.filters.gender);
        setFilterSkills(draft.filters.skills);
      }
    });
  }, [profile?.id, loadDraft]);

  // Start auto-save
  useEffect(() => {
    if (!profile?.id) return;
    startAutoSave(getCurrentState);
    return () => stopAutoSave();
  }, [profile?.id, startAutoSave, stopAutoSave, getCurrentState]);

  // Fetch recipients when filters change
  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchRecipients();
    }
  }, [targetRole, filterCountry, filterLanguage, filterGender, filterSkills, profile]);

  const fetchRecipients = async () => {
    setLoadingRecipients(true);
    
    const skillsArray = filterSkills.trim() 
      ? filterSkills.split(',').map(s => s.trim()).filter(Boolean)
      : null;

    const { data, error } = await supabase.rpc('get_broadcast_recipients', {
      _target_role: targetRole,
      _country: filterCountry || null,
      _language: filterLanguage || null,
      _gender: filterGender || null,
      _skills: skillsArray,
    });

    if (error) {
      toast({ title: "Error fetching recipients", description: error.message, variant: "destructive" });
    } else {
      setRecipients(data || []);
    }
    setLoadingRecipients(false);
  };

  const fetchBroadcastHistory = async () => {
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from('admin_broadcasts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      toast({ title: "Error fetching history", description: error.message, variant: "destructive" });
    } else {
      setBroadcasts(data || []);
    }
    setLoadingHistory(false);
  };

  const generatePreview = () => {
    const slots: EmailContentSlots = {
      headline: subject || 'Broadcast Message',
      body_primary: content,
    };
    const html = buildCanonicalEmail(slots, 'en');
    setPreviewHtml(html);
    setShowPreview(true);
  };

  const handleSend = async () => {
    if (!subject.trim() || !content.trim()) {
      toast({ title: "Subject and content required", variant: "destructive" });
      return;
    }

    if (recipients.length === 0) {
      toast({ title: "No recipients", description: "Adjust your filters to include recipients", variant: "destructive" });
      return;
    }

    setSending(true);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      if (sessionError || !session) {
        throw new Error("Session expired. Please log in again.");
      }

      const filters = {
        country: filterCountry || null,
        language: filterLanguage || null,
        gender: filterGender || null,
        skills: filterSkills.trim() ? filterSkills.split(',').map(s => s.trim()) : null,
      };

      const { data: broadcast, error: broadcastError } = await supabase
        .from('admin_broadcasts')
        .insert({
          subject,
          content,
          target_role: targetRole,
          filters,
          recipient_count: recipients.length,
          sent_by: profile?.id,
        })
        .select()
        .single();

      if (broadcastError) throw broadcastError;

      const recipientRecords = recipients.map(r => ({
        broadcast_id: broadcast.id,
        recipient_id: r.id,
        email_sent: false,
      }));

      const { error: recipientsError } = await supabase
        .from('broadcast_recipients')
        .insert(recipientRecords);

      if (recipientsError) throw recipientsError;

      const slots: EmailContentSlots = {
        headline: subject,
        body_primary: content,
      };
      const fullHtml = buildCanonicalEmail(slots, 'en');

      const { data: sendResult, error: sendError } = await supabase.functions.invoke('send-broadcast', {
        body: {
          broadcast_id: broadcast.id,
          recipients: recipients.map(r => ({
            id: r.id,
            email: r.email,
            first_name: r.full_name?.split(' ')[0] || 'User',
          })),
          subject,
          html_content: fullHtml,
        }
      });

      if (sendError) throw sendError;

      toast({
        title: "Broadcast sent!",
        description: `Sent to ${sendResult?.sent || recipients.length} recipients`,
      });

      const notifications = recipients.map(r => ({
        user_id: r.id,
        message: `📢 ${subject}`,
        action_type: 'info',
        link: null,
      }));

      await supabase.from('notifications').insert(notifications);

      // Clear draft after successful send
      await clearDraft();

      // Reset form
      setSubject('');
      setContent(DEFAULT_CONTENT);
      fetchBroadcastHistory();

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Error sending broadcast",
        description: errorMessage,
        variant: "destructive"
      });
    }

    setSending(false);
  };

  const handleLoadTemplate = (template: { subject: string; message_content: string }) => {
    setSubject(template.subject);
    setContent(template.message_content);
    toast({ title: "Template loaded" });
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return;
    setSavingTemplate(true);
    const ok = await saveTemplate(templateName.trim(), subject, content);
    setSavingTemplate(false);
    if (ok) {
      toast({ title: "Template saved" });
      setShowSaveTemplate(false);
      setTemplateName('');
      await loadTemplates();
    } else {
      toast({ title: "Failed to save", description: "A template with this name may already exist.", variant: "destructive" });
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    const ok = await deleteTemplate(id);
    if (ok) toast({ title: "Template deleted" });
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
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-serif">Broadcast Messages</h1>
            <p className="text-muted-foreground">Send announcements to mentors and students</p>
          </div>
        </div>

        <Tabs defaultValue="compose" className="space-y-6">
          <TabsList>
            <TabsTrigger value="compose" className="gap-2">
              <Radio className="h-4 w-4" />
              Compose
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2" onClick={fetchBroadcastHistory}>
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compose">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Filters Panel */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Recipient Filters
                  </CardTitle>
                  <CardDescription>
                    Filter recipients by profile attributes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Target Role</Label>
                    <Select value={targetRole} onValueChange={setTargetRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="mentor">Mentors Only</SelectItem>
                        <SelectItem value="student">Students Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Select value={filterCountry || "__any__"} onValueChange={(v) => setFilterCountry(v === "__any__" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__any__">Any country</SelectItem>
                        {COUNTRIES.map(c => (
                          <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select value={filterLanguage || "__any__"} onValueChange={(v) => setFilterLanguage(v === "__any__" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__any__">Any language</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select value={filterGender || "__any__"} onValueChange={(v) => setFilterGender(v === "__any__" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__any__">Any gender</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Skills (comma-separated)</Label>
                    <Input
                      value={filterSkills}
                      onChange={(e) => setFilterSkills(e.target.value)}
                      placeholder="e.g., Python, React"
                    />
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      {loadingRecipients ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <span className="font-medium">{recipients.length} recipients</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Compose Panel */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Compose Broadcast</CardTitle>
                        <CardDescription>
                          Available tokens: {`{{first_name}}`}
                        </CardDescription>
                      </div>
                      {/* Draft auto-save indicator */}
                      <div className="text-xs text-muted-foreground">
                        {savingDraft ? (
                          <span className="flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Saving…
                          </span>
                        ) : lastSaved ? (
                          <span>Draft saved {formatDistanceToNow(lastSaved, { addSuffix: true })}</span>
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Load Template dropdown */}
                    <div className="space-y-2">
                      <Label>Load Template</Label>
                      <DropdownMenu onOpenChange={(open) => { if (open) loadTemplates(); }}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full justify-start gap-2">
                            <FileText className="h-4 w-4" />
                            Select a template…
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-72">
                          {templates.length === 0 ? (
                            <DropdownMenuItem disabled>No templates saved yet</DropdownMenuItem>
                          ) : (
                            templates.map(t => (
                              <DropdownMenuItem
                                key={t.id}
                                className="flex items-center justify-between"
                                onSelect={(e) => {
                                  e.preventDefault();
                                  handleLoadTemplate(t);
                                }}
                              >
                                <span className="truncate mr-2">{t.name}</span>
                                {t.created_by === profile?.id && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTemplate(t.id);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                )}
                              </DropdownMenuItem>
                            ))
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Enter broadcast subject..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Message Content</Label>
                      <RichTextEditor
                        content={content}
                        onChange={setContent}
                        placeholder="Compose your broadcast..."
                      />
                    </div>

                    <div className="flex flex-wrap gap-3 pt-4">
                      <Button variant="outline" onClick={generatePreview} className="gap-2">
                        <Eye className="h-4 w-4" />
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowSaveTemplate(true)}
                        disabled={!subject && content === DEFAULT_CONTENT}
                        className="gap-2"
                      >
                        <Save className="h-4 w-4" />
                        Save as Template
                      </Button>
                      <Button
                        onClick={handleSend}
                        disabled={sending || recipients.length === 0 || !subject || !content}
                        className="gap-2 flex-1"
                      >
                        {sending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Send to {recipients.length} Recipients
                      </Button>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Recipients will receive both an email and an in-app notification.
                    </p>
                  </CardContent>
                </Card>

                {/* Preview */}
                {showPreview && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>Email Preview</CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
                        Close
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-lg overflow-hidden bg-white">
                        <iframe
                          srcDoc={previewHtml}
                          className="w-full h-[500px]"
                          title="Email Preview"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Broadcast History</CardTitle>
                <CardDescription>Recent broadcasts sent from this panel</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingHistory ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : broadcasts.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No broadcasts sent yet
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Recipients</TableHead>
                        <TableHead>Sent At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {broadcasts.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">{b.subject}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {b.target_role === 'all' ? 'All Users' : b.target_role}
                            </Badge>
                          </TableCell>
                          <TableCell>{b.recipient_count}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(b.created_at), 'PPp')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Template Dialog */}
        <Dialog open={showSaveTemplate} onOpenChange={setShowSaveTemplate}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save as Template</DialogTitle>
              <DialogDescription>
                Save the current subject and content as a reusable template.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value.slice(0, 100))}
                placeholder="e.g., Monthly Update"
                maxLength={100}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSaveTemplate(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveTemplate}
                disabled={savingTemplate || !templateName.trim()}
              >
                {savingTemplate ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminBroadcasts;
