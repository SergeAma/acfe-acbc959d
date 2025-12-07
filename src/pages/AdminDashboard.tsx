import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';

interface MentorRequest {
  id: string;
  user_id: string;
  status: string;
  reason: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

export const AdminDashboard = () => {
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<MentorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchRequests();
    }
  }, [profile]);

  const fetchRequests = async () => {
    setLoading(true);
    
    // Fetch requests
    const { data: requestData, error: requestError } = await supabase
      .from('mentor_role_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (requestError) {
      toast({
        title: "Error fetching requests",
        description: requestError.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Fetch profiles for each request
    if (requestData && requestData.length > 0) {
      const userIds = requestData.map(r => r.user_id);
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      // Combine data
      const enrichedRequests = requestData.map(request => ({
        ...request,
        profiles: profileData?.find(p => p.id === request.user_id)
      }));
      
      setRequests(enrichedRequests as MentorRequest[]);
    } else {
      setRequests([]);
    }
    
    setLoading(false);
  };

  const sendMentorApprovalEmail = async (userId: string, email: string, fullName: string) => {
    try {
      const firstName = fullName?.split(' ')[0] || 'Mentor';
      
      const { data, error } = await supabase.functions.invoke('send-mentor-approval-email', {
        body: {
          user_id: userId,
          email: email,
          first_name: firstName
        }
      });

      if (error) {
        console.error('Error sending mentor approval email:', error);
        toast({
          title: "Note",
          description: "Mentor approved but email notification failed to send.",
          variant: "default",
        });
      } else {
        console.log('Mentor approval email sent successfully:', data);
      }
    } catch (err) {
      console.error('Failed to send mentor approval email:', err);
    }
  };

  const handleApprove = async (requestId: string) => {
    if (!profile?.id) return;
    
    setProcessingId(requestId);
    
    // Find the request to get user details for email
    const request = requests.find(r => r.id === requestId);
    
    const { error } = await supabase.rpc('approve_mentor_request', {
      _request_id: requestId,
      _admin_id: profile.id
    });

    if (error) {
      toast({
        title: "Approval failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Request approved!",
        description: "User has been granted mentor role.",
      });
      
      // Send approval email
      if (request?.profiles?.email) {
        await sendMentorApprovalEmail(
          request.user_id,
          request.profiles.email,
          request.profiles.full_name || ''
        );
      }
      
      fetchRequests();
    }
    
    setProcessingId(null);
  };

  const sendMentorRejectionEmail = async (userId: string, email: string, fullName: string) => {
    try {
      const firstName = fullName?.split(' ')[0] || 'Applicant';
      
      const { data, error } = await supabase.functions.invoke('send-mentor-rejection-email', {
        body: {
          user_id: userId,
          email: email,
          first_name: firstName
        }
      });

      if (error) {
        console.error('Error sending mentor rejection email:', error);
      } else {
        console.log('Mentor rejection email sent successfully:', data);
      }
    } catch (err) {
      console.error('Failed to send mentor rejection email:', err);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!profile?.id) return;
    
    setProcessingId(requestId);
    
    // Find the request to get user details for email
    const request = requests.find(r => r.id === requestId);
    
    const { error } = await supabase.rpc('reject_mentor_request', {
      _request_id: requestId,
      _admin_id: profile.id
    });

    if (error) {
      toast({
        title: "Rejection failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Request rejected",
        description: "The mentor request has been rejected.",
      });
      
      // Send rejection email
      if (request?.profiles?.email) {
        await sendMentorRejectionEmail(
          request.user_id,
          request.profiles.email,
          request.profiles.full_name || ''
        );
      }
      
      fetchRequests();
    }
    
    setProcessingId(null);
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage mentor role requests</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/admin/newsletter')}>
                Newsletter Management
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/admin/email-logs')}>
                Email Logs
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/admin/email-templates')}>
                Email Templates
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/admin/courses')}>
                Manage Courses
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/admin/mentor-invitations')}>
                Mentor Invitations
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/admin/ideas')}>
                Idea Submissions
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/admin/news-curation')}>
                News Curation
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/admin/settings')}>
                System Settings
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate('/admin/users?filter=mentor')}>
            <CardHeader>
              <CardTitle>Manage Mentors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">View All</div>
              <p className="text-sm text-muted-foreground">Manage mentor accounts</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => navigate('/admin/users?filter=student')}>
            <CardHeader>
              <CardTitle>Manage Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">View All</div>
              <p className="text-sm text-muted-foreground">Manage student accounts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Mentor Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{requests.filter(r => r.status === 'pending').length}</div>
              <p className="text-sm text-muted-foreground">Pending approval</p>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-2xl font-semibold mb-4">Mentor Role Requests</h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : requests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No mentor role requests at this time.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {requests.map((request) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">
                        {request.profiles?.full_name || 'Unknown User'}
                      </CardTitle>
                      <CardDescription>{request.profiles?.email}</CardDescription>
                    </div>
                    <Badge 
                      variant={
                        request.status === 'approved' ? 'default' : 
                        request.status === 'rejected' ? 'destructive' : 
                        'secondary'
                      }
                      className="flex items-center gap-1"
                    >
                      {request.status === 'pending' && <Clock className="h-3 w-3" />}
                      {request.status === 'approved' && <CheckCircle className="h-3 w-3" />}
                      {request.status === 'rejected' && <XCircle className="h-3 w-3" />}
                      {request.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Request Reason:</h4>
                      <p className="text-muted-foreground">{request.reason}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Requested on: {new Date(request.created_at).toLocaleDateString()}
                    </div>
                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleApprove(request.id)}
                          disabled={processingId === request.id}
                          className="flex-1"
                        >
                          {processingId === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleReject(request.id)}
                          disabled={processingId === request.id}
                          variant="destructive"
                          className="flex-1"
                        >
                          {processingId === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <XCircle className="h-4 w-4 mr-2" />
                          )}
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
