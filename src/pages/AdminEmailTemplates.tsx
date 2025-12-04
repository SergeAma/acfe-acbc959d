import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Trash2, Edit, Mail, Eye } from 'lucide-react';
import { Navigate } from 'react-router-dom';

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
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
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
                      <Button variant="ghost" size="sm" onClick={() => openPreview(template)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(template)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)}>
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
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Preview: {previewTemplate?.name}</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">Subject: {previewTemplate?.subject}</p>
              <div 
                className="border rounded-lg p-4 bg-white overflow-auto max-h-[60vh]"
                dangerouslySetInnerHTML={{ __html: previewTemplate?.html_content || '' }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
