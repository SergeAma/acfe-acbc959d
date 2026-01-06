import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Shield, Plus, Loader2, Trash2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface ModeratorManagementProps {
  institutionId: string;
  institutionName: string;
  emailDomain?: string | null;
}

export const ModeratorManagement = ({
  institutionId,
  institutionName,
  emailDomain,
}: ModeratorManagementProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [moderatorEmail, setModeratorEmail] = useState('');

  // Fetch moderators
  const { data: moderators = [], isLoading } = useQuery({
    queryKey: ['institution-moderators', institutionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institution_moderators')
        .select(`
          id,
          email,
          user_id,
          created_at
        `)
        .eq('institution_id', institutionId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Fetch profile names for each moderator
      const moderatorsWithProfiles = await Promise.all(
        data.map(async (mod) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', mod.user_id)
            .maybeSingle();
          return { ...mod, full_name: profile?.full_name };
        })
      );

      return moderatorsWithProfiles;
    },
    enabled: !!institutionId,
  });

  // Add moderator mutation
  const addModeratorMutation = useMutation({
    mutationFn: async (email: string) => {
      // Validate email domain if institution has one
      if (emailDomain) {
        const emailParts = email.toLowerCase().split('@');
        const userDomain = emailParts[1];
        if (!userDomain || !userDomain.includes(emailDomain.toLowerCase())) {
          throw new Error(`Moderator email must contain the institution domain (${emailDomain})`);
        }
      }

      // Find user by email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) {
        throw new Error('No user found with this email. The user must have an account first.');
      }

      // Check if already a moderator
      const { data: existing } = await supabase
        .from('institution_moderators')
        .select('id')
        .eq('institution_id', institutionId)
        .eq('user_id', profile.id)
        .maybeSingle();

      if (existing) {
        throw new Error('This user is already a moderator for this institution');
      }

      // Add as moderator
      const { error } = await supabase
        .from('institution_moderators')
        .insert({
          institution_id: institutionId,
          user_id: profile.id,
          email: email.toLowerCase().trim(),
          created_by: user!.id,
        });

      if (error) throw error;
      return { email, name: profile.full_name };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['institution-moderators', institutionId] });
      setIsAddDialogOpen(false);
      setModeratorEmail('');
      toast.success(`${data.name || data.email} added as moderator`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Remove moderator mutation
  const removeModeratorMutation = useMutation({
    mutationFn: async (moderatorId: string) => {
      const { error } = await supabase
        .from('institution_moderators')
        .delete()
        .eq('id', moderatorId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institution-moderators', institutionId] });
      toast.success('Moderator removed');
    },
    onError: () => {
      toast.error('Failed to remove moderator');
    },
  });

  const handleAddModerator = () => {
    if (!moderatorEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    addModeratorMutation.mutate(moderatorEmail.trim());
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Institution Moderators
          </h3>
          <p className="text-sm text-muted-foreground">
            Moderators can manage students, view activity, and send broadcasts within this institution
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Moderator
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Moderator</DialogTitle>
              <DialogDescription>
                Add a moderator for {institutionName}. They will be able to manage students and view reports.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Moderator Email *</Label>
                <Input
                  type="email"
                  value={moderatorEmail}
                  onChange={(e) => setModeratorEmail(e.target.value)}
                  placeholder="moderator@institution.edu"
                />
                {emailDomain && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Email must contain: {emailDomain}
                  </p>
                )}
              </div>
              <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
                <p className="font-medium">Moderator capabilities:</p>
                <ul className="text-muted-foreground text-xs space-y-0.5 list-disc list-inside">
                  <li>View student tally and profiles</li>
                  <li>Track course activity and progress</li>
                  <li>Set reminders for follow-ups</li>
                  <li>Send broadcast messages to all students</li>
                  <li>Invite new students</li>
                  <li>Export activity reports (CSV)</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddModerator}
                disabled={!moderatorEmail.trim() || addModeratorMutation.isPending}
              >
                {addModeratorMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Moderator
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : moderators.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No moderators assigned yet</p>
          <p className="text-xs mt-1">Add a moderator to help manage this institution</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {moderators.map((mod) => (
              <TableRow key={mod.id}>
                <TableCell className="font-medium">
                  {mod.full_name || 'Unnamed User'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {mod.email}
                    <Badge variant="secondary" className="text-xs">
                      Moderator
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {mod.created_at ? format(new Date(mod.created_at), 'MMM d, yyyy') : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeModeratorMutation.mutate(mod.id)}
                    disabled={removeModeratorMutation.isPending}
                    title="Remove moderator"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};
