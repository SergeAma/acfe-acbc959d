import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Trash2, Edit, Mail, Eye, Send } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { sanitizeHtml } from '@/lib/sanitize-html';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  variables: unknown;
  created_at: string;
  updated_at: string;
}

export const AdminEmailTemplates = () => {
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [testTemplate, setTestTemplate] = useState<EmailTemplate | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    html_content: '',
    variables: ''
  });

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchTemplates();
    }
  }, [profile]);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: "Error fetching templates", description: error.message, variant: "destructive" });
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  };

  const openEditDialog = (template?: EmailTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        subject: template.subject,
        html_content: template.html_content,
        variables: Array.isArray(template.variables) ? template.variables.join(', ') : ''
      });
    } else {
      setEditingTemplate(null);
      setFormData({ name: '', subject: '', html_content: '', variables: '' });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.subject || !formData.html_content) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const templateData = {
      name: formData.name,
      subject: formData.subject,
      html_content: formData.html_content,
      variables: formData.variables ? formData.variables.split(',').map(v => v.trim()) : []
    };

    if (editingTemplate) {
      const { error } = await supabase
        .from('email_templates')
        .update(templateData)
        .eq('id', editingTemplate.id);

      if (error) {
        toast({ title: "Error updating template", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Template updated successfully" });
        setIsDialogOpen(false);
        fetchTemplates();
      }
    } else {
      const { error } = await supabase.from('email_templates').insert([templateData]);
      if (error) {
        toast({ title: "Error creating template", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Template created successfully" });
        setIsDialogOpen(false);
        fetchTemplates();
      }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('email_templates').delete().eq('id', id);
    if (error) {
      toast({ title: "Error deleting template", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Template deleted" });
      fetchTemplates();
    }
  };

  const openPreview = (template: EmailTemplate) => {
    setPreviewTemplate(template);
    setIsPreviewOpen(true);
  };

  const openTestDialog = (template: EmailTemplate) => {
    setTestTemplate(template);
    setTestEmail(profile?.email || '');
    setIsTestDialogOpen(true);
  };

  const handleSendTest = async () => {
    if (!testTemplate || !testEmail) {
      toast({ title: "Please enter an email address", variant: "destructive" });
      return;
    }

    setSendingTest(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-test-email', {
        body: {
          to_email: testEmail,
          subject: testTemplate.subject,
          html_content: testTemplate.html_content,
          test_data: {
            first_name: 'Test',
            last_name: 'User',
            email: testEmail
          }
        }
      });

      if (error) throw error;

      toast({ title: "Test email sent!", description: `Check ${testEmail} for the test email.` });
      setIsTestDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Failed to send test email", description: error.message, variant: "destructive" });
    } finally {
      setSendingTest(false);
    }
  };

  // Generate preview with sample data
  const getPreviewContent = (template: EmailTemplate) => {
    let content = template.html_content;
    const currentYear = new Date().getFullYear();
    
    // Replace variables with sample data
    content = content.replace(/\{\{first_name\}\}/gi, 'John');
    content = content.replace(/\{\{last_name\}\}/gi, 'Doe');
    content = content.replace(/\{\{name\}\}/gi, 'John Doe');
    content = content.replace(/\{\{email\}\}/gi, 'john.doe@example.com');
    content = content.replace(/\{\{year\}\}/gi, currentYear.toString());
    content = content.replace(/\{\{unsubscribe_url\}\}/gi, '#');
    // Replace outdated years
    content = content.replace(/2024/g, currentYear.toString());
    
    return content;
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
            <h1 className="text-3xl font-bold mb-2">Email Templates</h1>
            <p className="text-muted-foreground">Create and manage your email templates</p>
          </div>
          <Button onClick={() => openEditDialog()}>
            <Plus className="h-4 w-4 mr-2" />New Template
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold flex items-center gap-2">
                <Mail className="h-6 w-6 text-primary" />
                {templates.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No email templates yet.</p>
              <Button onClick={() => openEditDialog()} className="mt-4">
                Create Your First Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{template.name}</h3>
                      <p className="text-muted-foreground mt-1">Subject: {template.subject}</p>
                      {template.variables && Array.isArray(template.variables) && template.variables.length > 0 && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Variables: {template.variables.join(', ')}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Updated: {new Date(template.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openPreview(template)} title="Preview">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openTestDialog(template)} title="Send Test">
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(template)} title="Edit">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)} title="Delete">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create New Template'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Template Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Welcome Email"
                />
              </div>
              <div>
                <Label>Subject Line *</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g., Welcome to A Cloud for Everyone!"
                />
              </div>
              <div>
                <Label>Variables (comma-separated)</Label>
                <Input
                  value={formData.variables}
                  onChange={(e) => setFormData({ ...formData, variables: e.target.value })}
                  placeholder="e.g., first_name, email, company"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use {'{{variable_name}}'} in your HTML content to insert dynamic values
                </p>
              </div>
              <div>
                <Label>HTML Content *</Label>
                <Textarea
                  value={formData.html_content}
                  onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                  placeholder="<html><body>Hello {{first_name}}...</body></html>"
                  rows={15}
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} className="flex-1">
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </Button>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Preview: {previewTemplate?.name}</DialogTitle>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Subject:</p>
                  <p className="text-muted-foreground">{previewTemplate?.subject.replace(/\{\{first_name\}\}/gi, 'John')}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => previewTemplate && openTestDialog(previewTemplate)}>
                  <Send className="h-4 w-4 mr-2" />
                  Send Test
                </Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-2 text-sm font-medium border-b">Email Preview (with sample data)</div>
                <div 
                  className="p-4 bg-white overflow-auto max-h-[60vh]"
                  dangerouslySetInnerHTML={{ __html: previewTemplate ? sanitizeHtml(getPreviewContent(previewTemplate)) : '' }}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Send Test Dialog */}
        <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Test Email</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Template</Label>
                <p className="text-muted-foreground">{testTemplate?.name}</p>
              </div>
              <div>
                <Label>Send to Email Address</Label>
                <Input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="your@email.com"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Test email will have "[TEST]" prefix in the subject
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSendTest} disabled={sendingTest || !testEmail} className="flex-1">
                  {sendingTest ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send Test Email
                </Button>
                <Button variant="outline" onClick={() => setIsTestDialogOpen(false)}>Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
