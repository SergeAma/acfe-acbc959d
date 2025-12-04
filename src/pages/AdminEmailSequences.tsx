import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2, Edit, Play, Pause, Clock, Mail } from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
}

interface SequenceStep {
  id: string;
  step_order: number;
  delay_days: number;
  delay_hours: number;
  template_id: string;
  template?: EmailTemplate;
}

interface EmailSequence {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  steps?: SequenceStep[];
}

export const AdminEmailSequences = () => {
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [sequences, setSequences] = useState<EmailSequence[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isStepsDialogOpen, setIsStepsDialogOpen] = useState(false);
  const [editingSequence, setEditingSequence] = useState<EmailSequence | null>(null);
  const [selectedSequence, setSelectedSequence] = useState<EmailSequence | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', is_active: true });
  const [newStep, setNewStep] = useState({ template_id: '', delay_days: 0, delay_hours: 0 });

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchSequences();
      fetchTemplates();
    }
  }, [profile]);

  const fetchSequences = async () => {
    setLoading(true);
    const { data: sequencesData, error } = await supabase
      .from('email_sequences')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: "Error fetching sequences", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Fetch steps for each sequence
    if (sequencesData && sequencesData.length > 0) {
      const { data: stepsData } = await supabase
        .from('email_sequence_steps')
        .select('*, templates:email_templates(id, name, subject)')
        .in('sequence_id', sequencesData.map(s => s.id))
        .order('step_order');

      const enrichedSequences = sequencesData.map(sequence => ({
        ...sequence,
        steps: stepsData?.filter(s => s.sequence_id === sequence.id).map(step => ({
          ...step,
          template: step.templates as unknown as EmailTemplate
        })) || []
      }));
      setSequences(enrichedSequences);
    } else {
      setSequences([]);
    }
    setLoading(false);
  };

  const fetchTemplates = async () => {
    const { data } = await supabase.from('email_templates').select('id, name, subject').order('name');
    if (data) setTemplates(data);
  };

  const openEditDialog = (sequence?: EmailSequence) => {
    if (sequence) {
      setEditingSequence(sequence);
      setFormData({ name: sequence.name, description: sequence.description || '', is_active: sequence.is_active });
    } else {
      setEditingSequence(null);
      setFormData({ name: '', description: '', is_active: true });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }

    if (editingSequence) {
      const { error } = await supabase
        .from('email_sequences')
        .update(formData)
        .eq('id', editingSequence.id);

      if (error) {
        toast({ title: "Error updating sequence", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Sequence updated" });
        setIsDialogOpen(false);
        fetchSequences();
      }
    } else {
      const { error } = await supabase.from('email_sequences').insert([formData]);
      if (error) {
        toast({ title: "Error creating sequence", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Sequence created" });
        setIsDialogOpen(false);
        fetchSequences();
      }
    }
  };

  const handleDelete = async (id: string) => {
    // Delete steps first
    await supabase.from('email_sequence_steps').delete().eq('sequence_id', id);
    const { error } = await supabase.from('email_sequences').delete().eq('id', id);
    if (error) {
      toast({ title: "Error deleting sequence", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sequence deleted" });
      fetchSequences();
    }
  };

  const toggleActive = async (sequence: EmailSequence) => {
    const { error } = await supabase
      .from('email_sequences')
      .update({ is_active: !sequence.is_active })
      .eq('id', sequence.id);

    if (error) {
      toast({ title: "Error updating status", description: error.message, variant: "destructive" });
    } else {
      fetchSequences();
    }
  };

  const openStepsDialog = (sequence: EmailSequence) => {
    setSelectedSequence(sequence);
    setNewStep({ template_id: '', delay_days: 0, delay_hours: 0 });
    setIsStepsDialogOpen(true);
  };

  const handleAddStep = async () => {
    if (!selectedSequence || !newStep.template_id) {
      toast({ title: "Select a template", variant: "destructive" });
      return;
    }

    const nextOrder = (selectedSequence.steps?.length || 0) + 1;
    const { error } = await supabase.from('email_sequence_steps').insert([{
      sequence_id: selectedSequence.id,
      template_id: newStep.template_id,
      delay_days: newStep.delay_days,
      delay_hours: newStep.delay_hours,
      step_order: nextOrder
    }]);

    if (error) {
      toast({ title: "Error adding step", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Step added" });
      setNewStep({ template_id: '', delay_days: 0, delay_hours: 0 });
      fetchSequences();
      // Refresh the selected sequence
      const updated = sequences.find(s => s.id === selectedSequence.id);
      if (updated) setSelectedSequence(updated);
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    const { error } = await supabase.from('email_sequence_steps').delete().eq('id', stepId);
    if (error) {
      toast({ title: "Error deleting step", description: error.message, variant: "destructive" });
    } else {
      fetchSequences();
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Email Sequences</h1>
            <p className="text-muted-foreground">Create automated drip campaigns</p>
          </div>
          <Button onClick={() => openEditDialog()}>
            <Plus className="h-4 w-4 mr-2" />New Sequence
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Sequences</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{sequences.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {sequences.filter(s => s.is_active).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Inactive</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-muted-foreground">
                {sequences.filter(s => !s.is_active).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : sequences.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No email sequences yet.</p>
              <Button onClick={() => openEditDialog()} className="mt-4">
                Create Your First Sequence
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {sequences.map((sequence) => (
              <Card key={sequence.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">{sequence.name}</h3>
                        <Switch
                          checked={sequence.is_active}
                          onCheckedChange={() => toggleActive(sequence)}
                        />
                        {sequence.is_active ? (
                          <span className="text-green-600 text-sm flex items-center gap-1">
                            <Play className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm flex items-center gap-1">
                            <Pause className="h-3 w-3" /> Paused
                          </span>
                        )}
                      </div>
                      {sequence.description && (
                        <p className="text-muted-foreground mt-1">{sequence.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {sequence.steps?.length || 0} emails
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {sequence.steps?.reduce((acc, step) => acc + (step.delay_days || 0), 0) || 0} days total
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openStepsDialog(sequence)}>
                        Manage Steps
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(sequence)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(sequence.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Sequence Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSequence ? 'Edit Sequence' : 'Create New Sequence'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Sequence Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Welcome Series"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this sequence does..."
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Active</Label>
              </div>
              <Button onClick={handleSave} className="w-full">
                {editingSequence ? 'Update Sequence' : 'Create Sequence'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Manage Steps Dialog */}
        <Dialog open={isStepsDialogOpen} onOpenChange={setIsStepsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Sequence Steps: {selectedSequence?.name}</DialogTitle>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              {/* Existing Steps */}
              {sequences.find(s => s.id === selectedSequence?.id)?.steps?.map((step, index) => (
                <div key={step.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{step.template?.name || 'Unknown Template'}</p>
                    <p className="text-sm text-muted-foreground">
                      Wait {step.delay_days} days, {step.delay_hours} hours
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteStep(step.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}

              {/* Add New Step */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Add New Step</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-3">
                    <Label>Email Template</Label>
                    <Select
                      value={newStep.template_id}
                      onValueChange={(value) => setNewStep({ ...newStep, template_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select template..." />
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
                    <Label>Delay (Days)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newStep.delay_days}
                      onChange={(e) => setNewStep({ ...newStep, delay_days: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Delay (Hours)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      value={newStep.delay_hours}
                      onChange={(e) => setNewStep({ ...newStep, delay_hours: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleAddStep} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />Add Step
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
