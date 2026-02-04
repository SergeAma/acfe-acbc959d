import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, Send, Eye, FileSpreadsheet, Trash2, ArrowLeft } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { buildCanonicalEmail, EmailContentSlots } from '../../supabase/functions/_shared/email-template';

interface Recipient {
  first_name: string;
  last_name: string;
  email: string;
  company: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
}

export const AdminMassMailer = () => {
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const [campaignName, setCampaignName] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('<p>Dear {{first_name}},</p><p>Your message here...</p>');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  const loadTemplates = async () => {
    if (templatesLoaded) return;
    setLoading(true);
    const { data } = await supabase.from('email_templates').select('*').order('name');
    if (data) setTemplates(data);
    setTemplatesLoaded(true);
    setLoading(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({ title: "Invalid file type", description: "Please upload a CSV file", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (csvText: string) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      toast({ title: "Invalid CSV", description: "CSV must have a header row and at least one data row", variant: "destructive" });
      return;
    }

    const headerLine = lines[0].toLowerCase();
    const headers = headerLine.split(',').map(h => h.trim().replace(/['"]/g, ''));
    
    // Find column indices (flexible matching)
    const firstNameIdx = headers.findIndex(h => h.includes('first') && h.includes('name') || h === 'firstname' || h === 'first_name');
    const lastNameIdx = headers.findIndex(h => h.includes('last') && h.includes('name') || h === 'lastname' || h === 'last_name');
    const emailIdx = headers.findIndex(h => h.includes('email'));
    const companyIdx = headers.findIndex(h => h.includes('company') || h.includes('organization') || h.includes('org'));

    if (emailIdx === -1) {
      toast({ title: "Missing email column", description: "CSV must contain an 'email' column", variant: "destructive" });
      return;
    }

    const parsed: Recipient[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const email = values[emailIdx]?.trim().replace(/['"]/g, '');
      
      if (!email || !emailRegex.test(email)) continue;

      parsed.push({
        first_name: firstNameIdx >= 0 ? values[firstNameIdx]?.trim().replace(/['"]/g, '') || '' : '',
        last_name: lastNameIdx >= 0 ? values[lastNameIdx]?.trim().replace(/['"]/g, '') || '' : '',
        email: email,
        company: companyIdx >= 0 ? values[companyIdx]?.trim().replace(/['"]/g, '') || '' : '',
      });
    }

    if (parsed.length === 0) {
      toast({ title: "No valid recipients", description: "No valid email addresses found in CSV", variant: "destructive" });
      return;
    }

    setRecipients(parsed);
    toast({ title: "CSV imported", description: `${parsed.length} recipients loaded` });
  };

  // Handle CSV line parsing (accounts for quoted values with commas)
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const handleLoadTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setContent(template.html_content);
      setSelectedTemplateId(templateId);
      toast({ title: "Template loaded", description: `"${template.name}" has been loaded.` });
    }
  };

  const generatePreview = () => {
    const slots: EmailContentSlots = {
      headline: subject || 'Partnership Opportunity',
      body_primary: content,
    };
    const html = buildCanonicalEmail(slots, 'en');
    setPreviewHtml(html);
    setShowPreview(true);
  };

  const handleSend = async () => {
    if (!campaignName.trim()) {
      toast({ title: "Campaign name required", description: "Please enter a campaign name for tracking", variant: "destructive" });
      return;
    }

    if (!subject.trim() || !content.trim()) {
      toast({ title: "Subject and content required", variant: "destructive" });
      return;
    }

    if (recipients.length === 0) {
      toast({ title: "No recipients", description: "Please upload a CSV with recipients first", variant: "destructive" });
      return;
    }

    setSending(true);

    try {
      // Generate the full email HTML using canonical template
      const slots: EmailContentSlots = {
        headline: subject,
        body_primary: content,
      };
      const fullHtml = buildCanonicalEmail(slots, 'en');

      const { data, error } = await supabase.functions.invoke('send-mass-email', {
        body: {
          recipients,
          subject,
          html_content: fullHtml,
          campaign_name: campaignName.trim(),
        }
      });

      if (error) throw error;

      toast({
        title: "Emails sent!",
        description: `Sent: ${data.sent}, Failed: ${data.failed}`,
      });

      if (data.failed > 0) {
        console.error("Failed emails:", data.errors);
      }

      // Clear form after successful send
      setRecipients([]);
      setCampaignName('');
      if (fileInputRef.current) fileInputRef.current.value = '';

    } catch (error: any) {
      toast({
        title: "Error sending emails",
        description: error.message,
        variant: "destructive"
      });
    }

    setSending(false);
  };

  const removeRecipient = (index: number) => {
    setRecipients(prev => prev.filter((_, i) => i !== index));
  };

  const clearRecipients = () => {
    setRecipients([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
            <h1 className="text-3xl font-serif">Partnership Mass Mailer</h1>
            <p className="text-muted-foreground">Send branded e-blasts to external recipients</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column: Upload & Recipients */}
          <div className="space-y-6">
            {/* CSV Upload Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Upload Recipients
                </CardTitle>
                <CardDescription>
                  Upload a CSV with columns: first_name, last_name, email, company
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label htmlFor="csv-upload" className="cursor-pointer">
                      <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload CSV or drag and drop
                      </p>
                    </label>
                  </div>

                  {recipients.length > 0 && (
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-sm">
                        {recipients.length} recipients loaded
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={clearRecipients}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recipients Table */}
            {recipients.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recipients Preview</CardTitle>
                  <CardDescription>Review and edit before sending</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-h-64 overflow-y-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recipients.slice(0, 50).map((r, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">
                              {r.first_name} {r.last_name}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {r.email}
                            </TableCell>
                            <TableCell className="text-sm">
                              {r.company || '-'}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => removeRecipient(idx)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {recipients.length > 50 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Showing first 50 of {recipients.length} recipients
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Email Composer */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Compose Email</CardTitle>
                <CardDescription>
                  Available tokens: {`{{first_name}}, {{last_name}}, {{company}}, {{email}}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Campaign Name (for tracking)</Label>
                  <Input
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="e.g., Partnership Q1 2026"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Load from Template</Label>
                  <Select value={selectedTemplateId} onValueChange={handleLoadTemplate} onOpenChange={() => loadTemplates()}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {loading && (
                        <div className="p-2 text-center">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                        </div>
                      )}
                      {templates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter email subject..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email Content</Label>
                  <RichTextEditor
                    content={content}
                    onChange={setContent}
                    placeholder="Compose your email..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={generatePreview} className="gap-2">
                    <Eye className="h-4 w-4" />
                    Preview
                  </Button>
                  <Button
                    onClick={handleSend}
                    disabled={sending || recipients.length === 0 || !subject || !content || !campaignName}
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
                  Emails sent from: <strong>serge@acloudforeveryone.org</strong>
                </p>
              </CardContent>
            </Card>

            {/* Preview Modal */}
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
      </div>
    </div>
  );
};

export default AdminMassMailer;
