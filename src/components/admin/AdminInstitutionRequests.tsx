import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Building2, BookOpen, Users, Loader2, Check, Clock, X, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface MentorInstitutionRequest {
  id: string;
  mentor_id: string;
  institution_id: string;
  request_type: 'exclusive_content' | 'cohort_mentoring';
  status: 'pending' | 'approved' | 'rejected';
  reason: string | null;
  admin_response: string | null;
  created_at: string;
  mentor_profile?: {
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  };
  institution?: {
    name: string;
    logo_url: string | null;
  };
}

export const AdminInstitutionRequests = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<MentorInstitutionRequest | null>(null);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [adminResponse, setAdminResponse] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');

  // Fetch all institution requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ['admin-institution-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mentor_institution_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Fetch mentor profiles
      const mentorIds = [...new Set(data.map(r => r.mentor_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', mentorIds);

      // Fetch institutions
      const institutionIds = [...new Set(data.map(r => r.institution_id))];
      const { data: institutions } = await supabase
        .from('institutions')
        .select('id, name, logo_url')
        .in('id', institutionIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const institutionMap = new Map(institutions?.map(i => [i.id, i]) || []);

      return data.map(request => ({
        ...request,
        mentor_profile: profileMap.get(request.mentor_id),
        institution: institutionMap.get(request.institution_id),
      })) as MentorInstitutionRequest[];
    },
    enabled: profile?.role === 'admin',
  });

  // Handle request action
  const handleAction = useMutation({
    mutationFn: async ({ requestId, action, response }: { requestId: string; action: 'approve' | 'reject'; response: string }) => {
      const request = requests?.find(r => r.id === requestId);
      
      // Update request status
      const { error } = await supabase
        .from('mentor_institution_requests')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          admin_response: response || null,
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);
      
      if (error) throw error;

      // If approved for cohort mentoring, create the institution cohort
      if (action === 'approve' && request?.request_type === 'cohort_mentoring') {
        const { error: cohortError } = await supabase
          .from('institution_cohorts')
          .insert({
            mentor_id: request.mentor_id,
            institution_id: request.institution_id,
            name: `${request.institution?.name} Cohort`,
          });
        
        if (cohortError && !cohortError.message.includes('duplicate')) {
          throw cohortError;
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-institution-requests'] });
      toast({
        title: variables.action === 'approve' ? 'Request approved!' : 'Request rejected',
        description: variables.action === 'approve' 
          ? 'The mentor has been granted access.'
          : 'The mentor has been notified.',
      });
      setResponseDialogOpen(false);
      setSelectedRequest(null);
      setAdminResponse('');
    },
    onError: (error: any) => {
      toast({
        title: 'Action failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const pendingRequests = requests?.filter(r => r.status === 'pending') || [];
  const processedRequests = requests?.filter(r => r.status !== 'pending') || [];

  const openActionDialog = (request: MentorInstitutionRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setResponseDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Institution Partnership Requests
        </CardTitle>
        <CardDescription>
          Manage mentor requests for institution content and cohort mentoring
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending">
          <TabsList className="mb-4">
            <TabsTrigger value="pending">
              Pending ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="processed">
              Processed ({processedRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {pendingRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No pending requests</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={request.mentor_profile?.avatar_url || undefined} />
                        <AvatarFallback>{request.mentor_profile?.full_name?.charAt(0) || 'M'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{request.mentor_profile?.full_name || 'Unknown Mentor'}</p>
                        <p className="text-sm text-muted-foreground">{request.mentor_profile?.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">
                            {request.request_type === 'exclusive_content' ? (
                              <><BookOpen className="h-3 w-3 mr-1" />Exclusive Content</>
                            ) : (
                              <><Users className="h-3 w-3 mr-1" />Cohort Mentoring</>
                            )}
                          </Badge>
                          <Badge variant="secondary">{request.institution?.name}</Badge>
                        </div>
                        {request.reason && (
                          <p className="text-sm mt-2 text-muted-foreground">{request.reason}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(request.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openActionDialog(request, 'reject')}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => openActionDialog(request, 'approve')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="processed">
            {processedRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Check className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No processed requests</p>
              </div>
            ) : (
              <div className="space-y-4">
                {processedRequests.map((request) => (
                  <div key={request.id} className="flex items-start justify-between p-4 border rounded-lg opacity-75">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={request.mentor_profile?.avatar_url || undefined} />
                        <AvatarFallback>{request.mentor_profile?.full_name?.charAt(0) || 'M'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{request.mentor_profile?.full_name || 'Unknown Mentor'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {request.request_type === 'exclusive_content' ? 'Content' : 'Cohort'}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">{request.institution?.name}</Badge>
                        </div>
                      </div>
                    </div>
                    <Badge className={request.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {request.status === 'approved' ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                      {request.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Action Dialog */}
      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve' : 'Reject'} Request
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? `This will grant ${selectedRequest?.mentor_profile?.full_name} access to ${selectedRequest?.request_type === 'exclusive_content' ? 'create exclusive content for' : 'mentor a cohort from'} ${selectedRequest?.institution?.name}.`
                : `This will reject the request from ${selectedRequest?.mentor_profile?.full_name}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="response">Response message (optional)</Label>
              <Textarea
                id="response"
                placeholder="Add a message for the mentor..."
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResponseDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={actionType === 'approve' ? 'default' : 'destructive'}
              onClick={() => {
                if (selectedRequest) {
                  handleAction.mutate({
                    requestId: selectedRequest.id,
                    action: actionType,
                    response: adminResponse,
                  });
                }
              }}
              disabled={handleAction.isPending}
            >
              {handleAction.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                actionType === 'approve' ? 'Approve' : 'Reject'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
