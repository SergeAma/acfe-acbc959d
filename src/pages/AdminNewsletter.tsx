import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Send, Mail, Users, Eye, CheckCircle, Clock, AlertCircle, BarChart } from 'lucide-react';
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
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  
  const [broadcastData, setBroadcastData] = useState({
    template_id: '',
    subject: '',
    selectedTags: [] as string[],
    sendToAll: true
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
    // In a real implementation, filter contacts by tags
    return contacts.length; // Simplified for now
  };

  const handlePreview = () => {
    const template = templates.find(t => t.id === broadcastData.template_id);
    if (template) {
      setPreviewHtml(template.html_content);
      setIsPreviewOpen(true);
    }
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

      // Get recipients
      let recipients = contacts;
      if (!broadcastData.sendToAll && broadcastData.selectedTags.length > 0) {
        const { data: contactTagsData } = await supabase
          .from('contact_tags')
          .select('contact_id')
          .in('tag_id', broadcastData.selectedTags);
        
        const contactIds = [...new Set(contactTagsData?.map(ct => ct.contact_id) || [])];
        recipients = contacts.filter(c => contactIds.includes(c.id));
      }

      // Call edge function to send emails
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
          <Button onClick={() => setIsBroadcastOpen(true)}>
            <Send className="h-4 w-4 mr-2" />Send Broadcast
          </Button>
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
          <Button variant="outline" className="h-auto py-4 flex flex-col items-center" disabled>
            <BarChart className="h-6 w-6 mb-2" />
            <span>Analytics</span>
            <span className="text-xs text-muted-foreground mt-1">Coming soon</span>
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
