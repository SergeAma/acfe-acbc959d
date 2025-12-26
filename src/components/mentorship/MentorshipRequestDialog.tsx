import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface MentorshipRequestDialogProps {
  mentorId: string;
  mentorName: string;
}

export const MentorshipRequestDialog = ({ mentorId, mentorName }: MentorshipRequestDialogProps) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    studentBio: '',
    careerAmbitions: '',
    reasonForMentor: ''
  });

  // Check if user already has a pending/accepted request with this mentor
  const { data: existingRequest, refetch } = useQuery({
    queryKey: ['mentorship-request', mentorId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('mentorship_requests')
        .select('*')
        .eq('student_id', user.id)
        .eq('mentor_id', mentorId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleSubmit = async () => {
    if (!user) {
      navigate(`/auth?redirect=/mentors/${mentorId}`);
      return;
    }

    if (!formData.studentBio || !formData.careerAmbitions || !formData.reasonForMentor) {
      toast({
        title: 'Please fill in all fields',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('mentorship_requests')
        .insert({
          student_id: user.id,
          mentor_id: mentorId,
          student_bio: formData.studentBio,
          career_ambitions: formData.careerAmbitions,
          reason_for_mentor: formData.reasonForMentor
        });

      if (error) throw error;

      // Send notification email to mentor
      try {
        await supabase.functions.invoke('send-mentorship-request-notification', {
          body: {
            mentorId,
            studentName: profile?.full_name || user.email,
            studentBio: formData.studentBio,
            careerAmbitions: formData.careerAmbitions,
            reason: formData.reasonForMentor
          }
        });
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError);
      }

      toast({
        title: 'Request Sent!',
        description: `Your mentorship request has been sent to ${mentorName}.`
      });

      setOpen(false);
      setFormData({ studentBio: '', careerAmbitions: '', reasonForMentor: '' });
      refetch();
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast({
        title: 'Failed to send request',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Don't show if user is the mentor
  if (user?.id === mentorId) {
    return null;
  }

  // Show status if request already exists
  if (existingRequest) {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      accepted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      course_required: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    };

    const statusLabels = {
      pending: 'Request Pending',
      accepted: 'You are in this cohort!',
      course_required: 'Complete course first'
    };

    return (
      <div className={`px-4 py-2 rounded-full text-sm font-medium ${statusColors[existingRequest.status as keyof typeof statusColors]}`}>
        {statusLabels[existingRequest.status as keyof typeof statusLabels]}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Request Mentorship
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Request Mentorship from {mentorName}</DialogTitle>
          <DialogDescription>
            Tell {mentorName?.split(' ')[0]} about yourself and why you'd like to join their mentorship cohort.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="studentBio">Brief Bio</Label>
            <Textarea
              id="studentBio"
              placeholder="Tell us about yourself, your background, and current role..."
              value={formData.studentBio}
              onChange={(e) => setFormData({ ...formData, studentBio: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="careerAmbitions">Career Ambitions</Label>
            <Textarea
              id="careerAmbitions"
              placeholder="What are your career goals? Where do you see yourself in the future?"
              value={formData.careerAmbitions}
              onChange={(e) => setFormData({ ...formData, careerAmbitions: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reasonForMentor">Why This Mentor?</Label>
            <Textarea
              id="reasonForMentor"
              placeholder={`Why do you think ${mentorName?.split(' ')[0]} would be a great mentor for you?`}
              value={formData.reasonForMentor}
              onChange={(e) => setFormData({ ...formData, reasonForMentor: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Request'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
