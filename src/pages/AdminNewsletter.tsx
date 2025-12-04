import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Send, Mail, Users, Eye, CheckCircle, Clock, AlertCircle, BarChart, Newspaper, TestTube } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Contact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

interface EmailLog {
  id: string;
  subject: string;
  status: string;
  sent_at: string;
  opened_at: string | null;
  clicked_at: string | null;
  contact?: Contact;
}

interface NewsArticle {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
  category: string;
}

export const AdminNewsletter = () => {
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isNewsletterBuilderOpen, setIsNewsletterBuilderOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  
  const [broadcastData, setBroadcastData] = useState({
    template_id: '',
    subject: '',
    selectedTags: [] as string[],
    sendToAll: true
  });

  const [newsletterData, setNewsletterData] = useState({
    subject: '',
    intro: '',
    selectedArticles: [] as number[]
  });

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    
    const [templatesRes, tagsRes, contactsRes, logsRes] = await Promise.all([
      supabase.from('email_templates').select('*').order('name'),
      supabase.from('tags').select('*').order('name'),
      supabase.from('contacts').select('*'),
      supabase.from('email_logs').select('*, contacts(id, email, first_name, last_name)').order('sent_at', { ascending: false }).limit(50)
    ]);

    if (templatesRes.data) setTemplates(templatesRes.data);
    if (tagsRes.data) setTags(tagsRes.data);
    if (contactsRes.data) setContacts(contactsRes.data);
    if (logsRes.data) {
      setEmailLogs(logsRes.data.map(log => ({
        ...log,
        contact: log.contacts as unknown as Contact
      })));
    }
    
    setLoading(false);
  };

  const fetchNewsArticles = async () => {
    setLoadingNews(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-tech-news');
      if (error) throw error;
      setNewsArticles(data.articles || []);
      setNewsletterData(prev => ({
        ...prev,
        selectedArticles: data.articles?.map((_: NewsArticle, i: number) => i) || []
      }));
    } catch (error: any) {
      toast({ title: "Error fetching news", description: error.message, variant: "destructive" });
    }
    setLoadingNews(false);
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setBroadcastData({
        ...broadcastData,
        template_id: templateId,
        subject: template.subject
      });
    }
  };

  const handleTagToggle = (tagId: string) => {
    const newTags = broadcastData.selectedTags.includes(tagId)
      ? broadcastData.selectedTags.filter(t => t !== tagId)
      : [...broadcastData.selectedTags, tagId];
    setBroadcastData({ ...broadcastData, selectedTags: newTags, sendToAll: false });
  };

  const getRecipientCount = () => {
    if (broadcastData.sendToAll) return contacts.length;
    return contacts.length;
  };

  const handlePreview = () => {
    const template = templates.find(t => t.id === broadcastData.template_id);
    if (template) {
      setPreviewHtml(template.html_content);
      setIsPreviewOpen(true);
    }
  };

  const generateNewsletterHtml = () => {
    const currentYear = new Date().getFullYear();
    const selectedNews = newsArticles.filter((_, i) => newsletterData.selectedArticles.includes(i));
    
    const articlesHtml = selectedNews.map(article => `
      <tr>
        <td style="padding: 20px 0; border-bottom: 1px solid #e5e5e5;">
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td>
                <span style="display: inline-block; background: #10b981; color: white; font-size: 10px; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; margin-bottom: 8px;">${article.category}</span>
                <h3 style="font-size: 18px; font-weight: 600; color: #1f2937; margin: 8px 0;">
                  <a href="${article.link}" style="color: #1f2937; text-decoration: none;">${article.title}</a>
                </h3>
                <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 8px 0;">${article.description}</p>
                <p style="font-size: 12px; color: #9ca3af; margin-top: 8px;">
                  ${article.source} • ${new Date(article.pubDate).toLocaleDateString()}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1f2937 0%, #374151 100%); padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: 700;">A Cloud for Everyone</h1>
              <p style="color: #9ca3af; font-size: 14px; margin: 10px 0 0 0;">Digital Skills & Tech News from Africa</p>
            </td>
          </tr>
          
          <!-- Intro -->
          <tr>
            <td style="padding: 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0;">
                Hello {{first_name}},
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 16px 0 0 0;">
                ${newsletterData.intro || "Here's your weekly roundup of the latest tech news, digital skills updates, and innovation stories from across Africa."}
              </p>
            </td>
          </tr>
          
          <!-- Articles -->
          <tr>
            <td style="padding: 0 30px;">
              <h2 style="color: #1f2937; font-size: 20px; font-weight: 600; margin: 0 0 20px 0; padding-bottom: 10px; border-bottom: 2px solid #10b981;">
                📰 This Week's Headlines
              </h2>
              <table cellpadding="0" cellspacing="0" width="100%">
                ${articlesHtml}
              </table>
            </td>
          </tr>
          
          <!-- CTA -->
          <tr>
            <td style="padding: 30px; text-align: center;">
              <a href="https://acloudforeveryone.org/courses" style="display: inline-block; background: #10b981; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                Explore Our Courses
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #1f2937; padding: 30px; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                A Cloud for Everyone - Empowering African Youth with Digital Skills
              </p>
              <p style="color: #6b7280; font-size: 11px; margin: 10px 0 0 0;">
                © ${currentYear} A Cloud for Everyone. All rights reserved.
              </p>
              <p style="color: #6b7280; font-size: 11px; margin: 10px 0 0 0;">
                <a href="{{unsubscribe_url}}" style="color: #6b7280;">Unsubscribe</a> | 
                <a href="https://acloudforeveryone.org" style="color: #6b7280;">Visit Website</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  };

  const handlePreviewNewsletter = () => {
    const html = generateNewsletterHtml();
    setPreviewHtml(html.replace(/\{\{first_name\}\}/g, 'Preview User'));
    setIsPreviewOpen(true);
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast({ title: "Please enter a test email address", variant: "destructive" });
      return;
    }

    setSendingTest(true);
    try {
      const template = templates.find(t => t.id === broadcastData.template_id);
      const html = template ? template.html_content : generateNewsletterHtml();
      
      const { error } = await supabase.functions.invoke('send-newsletter', {
        body: {
          recipients: [{
            email: testEmail,
            first_name: 'Test',
            last_name: 'User',
            contact_id: null
          }],
          subject: `[TEST] ${broadcastData.subject || newsletterData.subject || 'Newsletter Preview'}`,
          html_content: html,
          template_id: broadcastData.template_id || null,
          is_test: true
        }
      });

      if (error) throw error;
      toast({ title: "Test email sent!", description: `Check ${testEmail} for the preview.` });
    } catch (error: any) {
      toast({ title: "Error sending test", description: error.message, variant: "destructive" });
    }
    setSendingTest(false);
  };

  const handleSendBroadcast = async () => {
    if (!broadcastData.template_id || !broadcastData.subject) {
      toast({ title: "Please select a template and subject", variant: "destructive" });
      return;
    }

    setSending(true);
    
    try {
      const template = templates.find(t => t.id === broadcastData.template_id);
      if (!template) throw new Error('Template not found');

      let recipients = contacts;
      if (!broadcastData.sendToAll && broadcastData.selectedTags.length > 0) {
        const { data: contactTagsData } = await supabase
          .from('contact_tags')
          .select('contact_id')
          .in('tag_id', broadcastData.selectedTags);
        
        const contactIds = [...new Set(contactTagsData?.map(ct => ct.contact_id) || [])];
        recipients = contacts.filter(c => contactIds.includes(c.id));
      }

      const { data, error } = await supabase.functions.invoke('send-newsletter', {
        body: {
          recipients: recipients.map(r => ({
            email: r.email,
            first_name: r.first_name,
            last_name: r.last_name,
            contact_id: r.id
          })),
          subject: broadcastData.subject,
          html_content: template.html_content,
          template_id: template.id
        }
      });

      if (error) throw error;

      toast({ 
        title: "Newsletter sent!", 
        description: `Successfully sent to ${recipients.length} recipients.` 
      });
      
      setIsBroadcastOpen(false);
      setBroadcastData({ template_id: '', subject: '', selectedTags: [], sendToAll: true });
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

  const handleSendNewsletterBroadcast = async () => {
    if (!newsletterData.subject) {
      toast({ title: "Please enter a subject line", variant: "destructive" });
      return;
    }

    setSending(true);
    
    try {
      const html = generateNewsletterHtml();

      const { error } = await supabase.functions.invoke('send-newsletter', {
        body: {
          recipients: contacts.map(r => ({
            email: r.email,
            first_name: r.first_name,
            last_name: r.last_name,
            contact_id: r.id
          })),
          subject: newsletterData.subject,
          html_content: html,
          template_id: null
        }
      });

      if (error) throw error;

      toast({ 
        title: "Newsletter sent!", 
        description: `Successfully sent to ${contacts.length} recipients.` 
      });
      
      setIsNewsletterBuilderOpen(false);
      setNewsletterData({ subject: '', intro: '', selectedArticles: [] });
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

  const toggleArticleSelection = (index: number) => {
    setNewsletterData(prev => ({
      ...prev,
      selectedArticles: prev.selectedArticles.includes(index)
        ? prev.selectedArticles.filter(i => i !== index)
        : [...prev.selectedArticles, index]
    }));
  };

  const stats = {
    totalSent: emailLogs.filter(l => l.status === 'sent').length,
    opened: emailLogs.filter(l => l.opened_at).length,
    clicked: emailLogs.filter(l => l.clicked_at).length
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Newsletter</h1>
            <p className="text-muted-foreground">Send broadcasts and manage your email campaigns</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              setIsNewsletterBuilderOpen(true);
              fetchNewsArticles();
            }}>
              <Newspaper className="h-4 w-4 mr-2" />Build from News
            </Button>
            <Button onClick={() => setIsBroadcastOpen(true)}>
              <Send className="h-4 w-4 mr-2" />Send Broadcast
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Button variant="outline" className="h-auto py-4 flex flex-col items-center" onClick={() => navigate('/admin/contacts')}>
            <Users className="h-6 w-6 mb-2" />
            <span>Manage Contacts</span>
            <span className="text-xs text-muted-foreground mt-1">{contacts.length} contacts</span>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex flex-col items-center" onClick={() => navigate('/admin/email-templates')}>
            <Mail className="h-6 w-6 mb-2" />
            <span>Email Templates</span>
            <span className="text-xs text-muted-foreground mt-1">{templates.length} templates</span>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex flex-col items-center" onClick={() => navigate('/admin/email-sequences')}>
            <Clock className="h-6 w-6 mb-2" />
            <span>Sequences</span>
            <span className="text-xs text-muted-foreground mt-1">Drip campaigns</span>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex flex-col items-center" onClick={() => navigate('/admin/email-analytics')}>
            <BarChart className="h-6 w-6 mb-2" />
            <span>Analytics</span>
            <span className="text-xs text-muted-foreground mt-1">View insights</span>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Subscribers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                {contacts.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Emails Sent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold flex items-center gap-2">
                <Send className="h-6 w-6 text-blue-500" />
                {stats.totalSent}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Opened</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold flex items-center gap-2">
                <Eye className="h-6 w-6 text-green-500" />
                {stats.opened}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Clicked</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-purple-500" />
                {stats.clicked}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Emails */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Email Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : emailLogs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No emails sent yet.</p>
            ) : (
              <div className="space-y-4">
                {emailLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                    <div>
                      <p className="font-medium">{log.subject}</p>
                      <p className="text-sm text-muted-foreground">
                        To: {log.contact?.email || 'Unknown'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={log.status === 'sent' ? 'default' : 'destructive'}>
                        {log.status}
                      </Badge>
                      {log.opened_at && (
                        <Badge variant="outline" className="text-green-600">
                          <Eye className="h-3 w-3 mr-1" />Opened
                        </Badge>
                      )}
                      {log.clicked_at && (
                        <Badge variant="outline" className="text-purple-600">
                          <CheckCircle className="h-3 w-3 mr-1" />Clicked
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {new Date(log.sent_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Broadcast Dialog */}
        <Dialog open={isBroadcastOpen} onOpenChange={setIsBroadcastOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Send Newsletter Broadcast</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Email Template *</Label>
                <Select
                  value={broadcastData.template_id}
                  onValueChange={handleTemplateSelect}
                >
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

              <div>
                <Label>Subject Line *</Label>
                <Input
                  value={broadcastData.subject}
                  onChange={(e) => setBroadcastData({ ...broadcastData, subject: e.target.value })}
                  placeholder="Enter email subject..."
                />
              </div>

              <div>
                <Label className="mb-3 block">Recipients</Label>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={broadcastData.sendToAll}
                      onCheckedChange={(checked) => setBroadcastData({ 
                        ...broadcastData, 
                        sendToAll: !!checked,
                        selectedTags: checked ? [] : broadcastData.selectedTags 
                      })}
                    />
                    <span>Send to all contacts ({contacts.length})</span>
                  </div>
                  
                  {!broadcastData.sendToAll && (
                    <div className="pl-6">
                      <p className="text-sm text-muted-foreground mb-2">Or select specific tags:</p>
                      <div className="flex flex-wrap gap-2">
                        {tags.map(tag => (
                          <Badge
                            key={tag.id}
                            style={{ 
                              backgroundColor: broadcastData.selectedTags.includes(tag.id) ? tag.color : 'transparent',
                              borderColor: tag.color,
                              color: broadcastData.selectedTags.includes(tag.id) ? 'white' : tag.color
                            }}
                            className="cursor-pointer border"
                            onClick={() => handleTagToggle(tag.id)}
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm">
                  <strong>Recipients:</strong> {getRecipientCount()} contacts will receive this email
                </p>
              </div>

              {/* Test Email Section */}
              <div className="border-t pt-4">
                <Label className="mb-2 block">Send Test Email</Label>
                <div className="flex gap-2">
                  <Input
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="your@email.com"
                    type="email"
                  />
                  <Button 
                    variant="outline" 
                    onClick={handleSendTestEmail}
                    disabled={sendingTest || !broadcastData.template_id}
                  >
                    {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                {broadcastData.template_id && (
                  <Button variant="outline" onClick={handlePreview}>
                    <Eye className="h-4 w-4 mr-2" />Preview
                  </Button>
                )}
                <Button 
                  onClick={handleSendBroadcast} 
                  className="flex-1"
                  disabled={sending || !broadcastData.template_id || !broadcastData.subject}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send to {getRecipientCount()} Recipients
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Newsletter Builder Dialog */}
        <Dialog open={isNewsletterBuilderOpen} onOpenChange={setIsNewsletterBuilderOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Build Newsletter from RSS News</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Subject Line *</Label>
                <Input
                  value={newsletterData.subject}
                  onChange={(e) => setNewsletterData({ ...newsletterData, subject: e.target.value })}
                  placeholder="e.g., Weekly Tech Digest - December 2024"
                />
              </div>

              <div>
                <Label>Introduction Message</Label>
                <Input
                  value={newsletterData.intro}
                  onChange={(e) => setNewsletterData({ ...newsletterData, intro: e.target.value })}
                  placeholder="Optional custom intro message..."
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <Label>Select Articles to Include</Label>
                  <Button variant="ghost" size="sm" onClick={fetchNewsArticles} disabled={loadingNews}>
                    {loadingNews ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
                  </Button>
                </div>
                
                {loadingNews ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : newsArticles.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No articles found. Click Refresh to load.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                    {newsArticles.map((article, index) => (
                      <div 
                        key={index}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          newsletterData.selectedArticles.includes(index) 
                            ? 'bg-primary/10 border-primary border' 
                            : 'bg-muted/50 hover:bg-muted'
                        }`}
                        onClick={() => toggleArticleSelection(index)}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox 
                            checked={newsletterData.selectedArticles.includes(index)}
                            onCheckedChange={() => toggleArticleSelection(index)}
                          />
                          <div className="flex-1">
                            <Badge variant="outline" className="mb-1 text-xs">{article.category}</Badge>
                            <h4 className="font-medium text-sm">{article.title}</h4>
                            <p className="text-xs text-muted-foreground mt-1">{article.source}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm">
                  <strong>{newsletterData.selectedArticles.length}</strong> articles selected • 
                  Will be sent to <strong>{contacts.length}</strong> contacts
                </p>
              </div>

              {/* Test Email Section */}
              <div className="border-t pt-4">
                <Label className="mb-2 block">Send Test Email</Label>
                <div className="flex gap-2">
                  <Input
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="your@email.com"
                    type="email"
                  />
                  <Button 
                    variant="outline" 
                    onClick={async () => {
                      if (!testEmail) {
                        toast({ title: "Please enter a test email address", variant: "destructive" });
                        return;
                      }
                      setSendingTest(true);
                      try {
                        const html = generateNewsletterHtml();
                        const { error } = await supabase.functions.invoke('send-newsletter', {
                          body: {
                            recipients: [{
                              email: testEmail,
                              first_name: 'Test',
                              last_name: 'User',
                              contact_id: null
                            }],
                            subject: `[TEST] ${newsletterData.subject || 'Newsletter Preview'}`,
                            html_content: html,
                            template_id: null,
                            is_test: true
                          }
                        });
                        if (error) throw error;
                        toast({ title: "Test email sent!", description: `Check ${testEmail} for the preview.` });
                      } catch (error: any) {
                        toast({ title: "Error sending test", description: error.message, variant: "destructive" });
                      }
                      setSendingTest(false);
                    }}
                    disabled={sendingTest || newsletterData.selectedArticles.length === 0}
                  >
                    {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handlePreviewNewsletter} disabled={newsletterData.selectedArticles.length === 0}>
                  <Eye className="h-4 w-4 mr-2" />Preview
                </Button>
                <Button 
                  onClick={handleSendNewsletterBroadcast} 
                  className="flex-1"
                  disabled={sending || !newsletterData.subject || newsletterData.selectedArticles.length === 0}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send to {contacts.length} Recipients
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Email Preview</DialogTitle>
            </DialogHeader>
            <div 
              className="border rounded-lg p-4 bg-white overflow-auto max-h-[60vh]"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
