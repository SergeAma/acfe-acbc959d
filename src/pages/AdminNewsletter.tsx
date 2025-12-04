import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';
import { Loader2, Send, Sparkles, Save, Eye, BarChart, Mail, Users, Check, Clock, FileText, Trash2, Calendar } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface Contact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

interface NewsArticle {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
  category: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
}

interface ScheduledNewsletter {
  id: string;
  subject: string;
  scheduled_at: string;
  status: string;
  recipient_count: number;
}

const DRAFT_STORAGE_KEY = 'newsletter_draft';

export const AdminNewsletter = () => {
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [scheduledNewsletters, setScheduledNewsletters] = useState<ScheduledNewsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingNews, setLoadingNews] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  
  const [newsletterData, setNewsletterData] = useState({
    subject: 'Weekly Africa Tech News Digest',
    content: '<h2>This Week\'s Highlights</h2><p>Your newsletter content here...</p>'
  });

  // Template dialog
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Schedule dialog
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  // Stats for tabs
  const [inquiryCount, setInquiryCount] = useState(0);
  const [subscriberCount, setSubscriberCount] = useState(0);

  // Load draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setNewsletterData(draft);
      } catch (e) {
        // Invalid draft, ignore
      }
    }
  }, []);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    
    const [contactsRes, ideasRes, templatesRes, scheduledRes] = await Promise.all([
      supabase.from('contacts').select('*'),
      supabase.from('idea_submissions').select('id', { count: 'exact' }),
      supabase.from('email_templates').select('*').order('name'),
      supabase.from('scheduled_newsletters').select('*').order('scheduled_at', { ascending: false }).limit(10)
    ]);

    if (contactsRes.data) {
      setContacts(contactsRes.data);
      setSubscriberCount(contactsRes.data.length);
    }
    if (ideasRes.count !== null) {
      setInquiryCount(ideasRes.count);
    }
    if (templatesRes.data) {
      setTemplates(templatesRes.data);
    }
    if (scheduledRes.data) {
      setScheduledNewsletters(scheduledRes.data);
    }
    
    setLoading(false);
  };

  const handleSaveDraft = () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(newsletterData));
    setDraftSaved(true);
    toast({ title: "Draft saved", description: "Your newsletter draft has been saved locally." });
    setTimeout(() => setDraftSaved(false), 2000);
  };

  const handleSaveAsTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast({ title: "Please enter a template name", variant: "destructive" });
      return;
    }

    setSavingTemplate(true);
    try {
      const { error } = await supabase.from('email_templates').insert({
        name: newTemplateName,
        subject: newsletterData.subject,
        html_content: generatePreviewHtml(),
      });

      if (error) throw error;

      toast({ title: "Template saved", description: `Template "${newTemplateName}" has been saved.` });
      setNewTemplateName('');
      setIsTemplateDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: "Error saving template", description: error.message, variant: "destructive" });
    }
    setSavingTemplate(false);
  };

  const handleLoadTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setNewsletterData({
        subject: template.subject,
        content: template.html_content,
      });
      setSelectedTemplateId(templateId);
      toast({ title: "Template loaded", description: `"${template.name}" has been loaded.` });
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase.from('email_templates').delete().eq('id', templateId);
      if (error) throw error;
      toast({ title: "Template deleted" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error deleting template", description: error.message, variant: "destructive" });
    }
  };

  const fetchNewsArticles = async () => {
    setLoadingNews(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-tech-news');
      if (error) throw error;
      
      const articles: NewsArticle[] = data.articles || [];
      if (articles.length > 0) {
        const articlesHtml = articles.slice(0, 5).map(article => `
<div style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #e5e5e5;">
  <span style="display: inline-block; background: #10b981; color: white; font-size: 10px; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; margin-bottom: 8px;">${article.category}</span>
  <h3 style="font-size: 18px; font-weight: 600; color: #1f2937; margin: 8px 0;">
    <a href="${article.link}" style="color: #1f2937; text-decoration: none;">${article.title}</a>
  </h3>
  <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 8px 0;">${article.description}</p>
  <p style="font-size: 12px; color: #9ca3af; margin-top: 8px;">
    ${article.source} • ${new Date(article.pubDate).toLocaleDateString()}
  </p>
</div>`).join('\n');

        setNewsletterData(prev => ({
          ...prev,
          content: `<h2>This Week's Headlines</h2>\n${articlesHtml}`
        }));
        toast({ title: "Content loaded from RSS", description: `${articles.length} articles fetched` });
      }
    } catch (error: any) {
      toast({ title: "Error fetching news", description: error.message, variant: "destructive" });
    }
    setLoadingNews(false);
  };

  const generatePreviewHtml = () => {
    const currentYear = new Date().getFullYear();
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #ffffff; }
  </style>
</head>
<body>
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #1f2937;">
      <h1 style="font-size: 24px; font-weight: 700; color: #1f2937; margin: 0;">Spectrogram Consulting</h1>
      <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0 0;">${newsletterData.subject || 'Weekly Africa Tech News Digest'}</p>
    </div>
    
    <div style="color: #374151; font-size: 14px; line-height: 1.6;">
      ${newsletterData.content || '<p style="color: #9ca3af; font-style: italic;">Enter content to see preview...</p>'}
    </div>
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #6b7280; font-size: 12px;">
      <p style="margin: 0;">You're receiving this because you subscribed to our newsletter.</p>
      <p style="margin: 8px 0 0 0;">© ${currentYear} Spectrogram Consulting. All rights reserved.</p>
      <a href="#" style="color: #6b7280; text-decoration: underline;">Unsubscribe here</a>
    </div>
  </div>
</body>
</html>`;
  };

  const handleScheduleNewsletter = async () => {
    if (!scheduleDate || !scheduleTime) {
      toast({ title: "Please select date and time", variant: "destructive" });
      return;
    }

    if (!newsletterData.subject || !newsletterData.content) {
      toast({ title: "Please enter subject and content", variant: "destructive" });
      return;
    }

    setScheduling(true);
    try {
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
      
      const { error } = await supabase.from('scheduled_newsletters').insert({
        subject: newsletterData.subject,
        html_content: generatePreviewHtml(),
        scheduled_at: scheduledAt,
        recipient_count: contacts.length,
        created_by: profile?.id,
      });

      if (error) throw error;

      toast({ 
        title: "Newsletter scheduled!", 
        description: `Will be sent on ${format(new Date(scheduledAt), 'PPp')}` 
      });
      
      setIsScheduleDialogOpen(false);
      setScheduleDate('');
      setScheduleTime('');
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      fetchData();
    } catch (error: any) {
      toast({ title: "Error scheduling newsletter", description: error.message, variant: "destructive" });
    }
    setScheduling(false);
  };

  const handleCancelScheduled = async (id: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_newsletters')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Scheduled newsletter cancelled" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error cancelling", description: error.message, variant: "destructive" });
    }
  };

  const handleSendNewsletter = async () => {
    if (!newsletterData.subject || !newsletterData.content) {
      toast({ title: "Please enter subject and content", variant: "destructive" });
      return;
    }

    setSending(true);
    
    try {
      const fullHtml = generatePreviewHtml();

      const { error } = await supabase.functions.invoke('send-newsletter', {
        body: {
          recipients: contacts.map(r => ({
            email: r.email,
            first_name: r.first_name,
            last_name: r.last_name,
            contact_id: r.id
          })),
          subject: newsletterData.subject,
          html_content: fullHtml,
          template_id: null
        }
      });

      if (error) throw error;

      toast({ 
        title: "Newsletter sent!", 
        description: `Successfully sent to ${contacts.length} recipients.` 
      });
      
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      fetchData();
    } catch (error: any) {
      toast({ 
        title: "Error sending newsletter", 
        description: error.message, 
        variant: "destructive" 
      });
    }
    
    setSending(false);
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-serif">Admin Dashboard</h1>
          <Button variant="outline" onClick={() => navigate('/auth')}>Log Out</Button>
        </div>

        {/* Tab Navigation */}
        <Tabs defaultValue="newsletter" className="mb-8">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="analytics" onClick={() => navigate('/admin/email-analytics')} className="gap-2">
              <BarChart className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="inquiries" onClick={() => navigate('/admin/ideas')} className="gap-2">
              <Mail className="h-4 w-4" />
              Inquiries ({inquiryCount})
            </TabsTrigger>
            <TabsTrigger value="subscribers" onClick={() => navigate('/admin/contacts')} className="gap-2">
              <Users className="h-4 w-4" />
              Subscribers ({subscriberCount})
            </TabsTrigger>
            <TabsTrigger value="newsletter" className="gap-2">
              <Send className="h-4 w-4" />
              Newsletter
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Button 
            variant="outline" 
            onClick={fetchNewsArticles}
            disabled={loadingNews}
            className="gap-2"
          >
            {loadingNews ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Auto-fill from RSS
          </Button>
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={handleSaveDraft}
          >
            {draftSaved ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {draftSaved ? 'Saved!' : 'Save Draft'}
          </Button>

          {/* Template Management */}
          <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <FileText className="h-4 w-4" />
                Templates
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Newsletter Templates</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {/* Save as new template */}
                <div className="space-y-2">
                  <Label>Save current content as template</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      placeholder="Template name..."
                    />
                    <Button onClick={handleSaveAsTemplate} disabled={savingTemplate}>
                      {savingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                    </Button>
                  </div>
                </div>

                {/* Load existing template */}
                <div className="space-y-2">
                  <Label>Load from template</Label>
                  <Select value={selectedTemplateId} onValueChange={handleLoadTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Template list */}
                {templates.length > 0 && (
                  <div className="space-y-2">
                    <Label>Existing templates</Label>
                    <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                      {templates.map(template => (
                        <div key={template.id} className="flex items-center justify-between p-3">
                          <div>
                            <p className="font-medium text-sm">{template.name}</p>
                            <p className="text-xs text-muted-foreground">{template.subject}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Schedule Dialog */}
          <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Clock className="h-4 w-4" />
                Schedule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule Newsletter</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </div>
                <div className="bg-muted/30 p-3 rounded-lg text-sm">
                  Will be sent to <strong>{contacts.length}</strong> subscribers
                </div>
                <Button onClick={handleScheduleNewsletter} disabled={scheduling} className="w-full gap-2">
                  {scheduling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                  Schedule Newsletter
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Scheduled Newsletters */}
        {scheduledNewsletters.filter(n => n.status === 'scheduled').length > 0 && (
          <div className="mb-6 bg-muted/30 p-4 rounded-lg">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Scheduled Newsletters
            </h3>
            <div className="space-y-2">
              {scheduledNewsletters.filter(n => n.status === 'scheduled').map(newsletter => (
                <div key={newsletter.id} className="flex items-center justify-between bg-background p-3 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{newsletter.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      Scheduled for {format(new Date(newsletter.scheduled_at), 'PPp')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {newsletter.recipient_count} recipients
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleCancelScheduled(newsletter.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Content - Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Editor */}
          <div className="space-y-6">
            {/* Subscriber Count */}
            <div className="bg-muted/30 px-4 py-3 rounded-lg text-muted-foreground">
              Sending to {contacts.length} active subscriber{contacts.length !== 1 ? 's' : ''}.
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label className="font-semibold">Subject</Label>
              <Input
                value={newsletterData.subject}
                onChange={(e) => setNewsletterData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Weekly Africa Tech News Digest"
                className="bg-muted/30"
              />
            </div>

            {/* Content - Rich Text Editor */}
            <div className="space-y-2">
              <Label className="font-semibold">Content</Label>
              <RichTextEditor
                content={newsletterData.content}
                onChange={(html) => setNewsletterData(prev => ({ ...prev, content: html }))}
              />
            </div>

            {/* Send Button */}
            <Button 
              onClick={handleSendNewsletter}
              disabled={sending || !newsletterData.subject || !newsletterData.content}
              className="gap-2"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send Now
            </Button>
          </div>

          {/* Right Column - Preview */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span className="font-medium">Email Preview</span>
            </div>
            
            <div className="border rounded-lg bg-muted/20 overflow-hidden">
              {/* Preview Header */}
              <div className="bg-muted/50 px-4 py-2 border-b">
                <p className="text-xs text-muted-foreground">Subject:</p>
                <p className="font-medium">{newsletterData.subject || 'No subject'}</p>
              </div>
              
              {/* Preview Content */}
              <div 
                className="bg-white p-0 overflow-auto max-h-[500px]"
                dangerouslySetInnerHTML={{ __html: generatePreviewHtml() }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
