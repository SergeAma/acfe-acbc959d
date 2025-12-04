import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';
import { Loader2, Send, Sparkles, Save, Eye, BarChart, Mail, Users, Check } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RichTextEditor } from '@/components/RichTextEditor';

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

const DRAFT_STORAGE_KEY = 'newsletter_draft';

export const AdminNewsletter = () => {
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingNews, setLoadingNews] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  
  const [newsletterData, setNewsletterData] = useState({
    subject: 'Weekly Africa Tech News Digest',
    content: '<h2>This Week\'s Highlights</h2><p>Your newsletter content here...</p>'
  });

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
        toast({ title: "Draft loaded", description: "Your previous draft has been restored." });
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
    
    const [contactsRes, ideasRes] = await Promise.all([
      supabase.from('contacts').select('*'),
      supabase.from('idea_submissions').select('id', { count: 'exact' })
    ]);

    if (contactsRes.data) {
      setContacts(contactsRes.data);
      setSubscriberCount(contactsRes.data.length);
    }
    if (ideasRes.count !== null) {
      setInquiryCount(ideasRes.count);
    }
    
    setLoading(false);
  };

  const handleSaveDraft = () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(newsletterData));
    setDraftSaved(true);
    toast({ title: "Draft saved", description: "Your newsletter draft has been saved locally." });
    setTimeout(() => setDraftSaved(false), 2000);
  };

  const fetchNewsArticles = async () => {
    setLoadingNews(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-tech-news');
      if (error) throw error;
      
      const articles: NewsArticle[] = data.articles || [];
      if (articles.length > 0) {
        // Generate content from articles
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
      
      // Clear draft after successful send
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
        <div className="flex gap-3 mb-6">
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
        </div>

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
              Send Newsletter
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
