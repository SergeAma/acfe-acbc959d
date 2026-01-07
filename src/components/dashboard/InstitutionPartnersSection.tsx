import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Building2, BookOpen, Users, Loader2, Check, Clock, X } from 'lucide-react';

interface Institution {
  id: string;
  name: string;
  logo_url: string | null;
  slug: string;
}

interface MentorRequest {
  id: string;
  institution_id: string;
  request_type: 'exclusive_content' | 'cohort_mentoring';
  status: 'pending' | 'approved' | 'rejected';
  reason: string | null;
  created_at: string;
}

export const InstitutionPartnersSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [requestType, setRequestType] = useState<'exclusive_content' | 'cohort_mentoring'>('exclusive_content');
  const [reason, setReason] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch all active institutions
  const { data: institutions, isLoading: institutionsLoading } = useQuery({
    queryKey: ['active-institutions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institutions')
        .select('id, name, logo_url, slug')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as Institution[];
    },
  });

  // Fetch mentor's existing requests
  const { data: myRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['mentor-institution-requests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('mentor_institution_requests')
        .select('*')
        .eq('mentor_id', user.id);
      
      if (error) throw error;
      return data as MentorRequest[];
    },
    enabled: !!user,
  });

  // Submit request mutation
  const submitRequest = useMutation({
    mutationFn: async ({ institutionId, type, reasonText, institutionName }: { institutionId: string; type: 'exclusive_content' | 'cohort_mentoring'; reasonText: string; institutionName: string }) => {
      const { error } = await supabase
        .from('mentor_institution_requests')
        .insert({
          mentor_id: user?.id,
          institution_id: institutionId,
          request_type: type,
          reason: reasonText,
        });
      
      if (error) throw error;

      // Notify admins about the new request
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user?.id)
          .single();

        await supabase.functions.invoke('send-institution-request-notification', {
          body: {
            mentor_name: profile?.full_name || 'Unknown Mentor',
            mentor_email: profile?.email || '',
            institution_name: institutionName,
            request_type: type,
            reason: reasonText,
          },
        });
      } catch (emailError) {
        console.error('Failed to send admin notification:', emailError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor-institution-requests'] });
      toast({
        title: 'Request submitted!',
        description: 'Your request has been sent to the platform administrators.',
      });
      setDialogOpen(false);
      setReason('');
      setSelectedInstitution(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to submit request',
        description: error.message?.includes('duplicate') 
          ? 'You have already submitted this type of request for this institution.'
          : error.message,
        variant: 'destructive',
      });
    },
  });

  const getRequestStatus = (institutionId: string, type: 'exclusive_content' | 'cohort_mentoring') => {
    return myRequests?.find(r => r.institution_id === institutionId && r.request_type === type);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-0"><Check className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return null;
    }
  };

  const openRequestDialog = (institution: Institution, type: 'exclusive_content' | 'cohort_mentoring') => {
    setSelectedInstitution(institution);
    setRequestType(type);
    setDialogOpen(true);
  };

  if (institutionsLoading || requestsLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!institutions || institutions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Institution Partners
          </h2>
          <p className="text-muted-foreground mt-1">
            Request to create exclusive content or mentor institution cohorts
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {institutions.map((institution) => {
          const contentRequest = getRequestStatus(institution.id, 'exclusive_content');
          const cohortRequest = getRequestStatus(institution.id, 'cohort_mentoring');

          return (
            <Card key={institution.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={institution.logo_url || undefined} alt={institution.name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {institution.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base truncate">{institution.name}</CardTitle>
                    <CardDescription className="text-xs">Educational Partner</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span>Exclusive Content</span>
                  </div>
                  {contentRequest ? (
                    getStatusBadge(contentRequest.status)
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openRequestDialog(institution, 'exclusive_content')}
                    >
                      Request
                    </Button>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Mentor Cohort</span>
                  </div>
                  {cohortRequest ? (
                    getStatusBadge(cohortRequest.status)
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openRequestDialog(institution, 'cohort_mentoring')}
                    >
                      Request
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Request Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {requestType === 'exclusive_content' 
                ? 'Request Exclusive Content Creation' 
                : 'Request Institution Cohort Mentoring'}
            </DialogTitle>
            <DialogDescription>
              {requestType === 'exclusive_content'
                ? `Create courses exclusively for ${selectedInstitution?.name} students.`
                : `Mentor a dedicated cohort of students from ${selectedInstitution?.name}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarImage src={selectedInstitution?.logo_url || undefined} />
                <AvatarFallback>{selectedInstitution?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{selectedInstitution?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {requestType === 'exclusive_content' ? 'Exclusive Content' : 'Cohort Mentoring'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Why do you want to {requestType === 'exclusive_content' ? 'create content for' : 'mentor students from'} this institution?</Label>
              <Textarea
                id="reason"
                placeholder="Describe your experience, expertise, and motivation..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedInstitution) {
                  submitRequest.mutate({
                    institutionId: selectedInstitution.id,
                    type: requestType,
                    reasonText: reason,
                    institutionName: selectedInstitution.name,
                  });
                }
              }}
              disabled={submitRequest.isPending || !reason.trim()}
            >
              {submitRequest.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
