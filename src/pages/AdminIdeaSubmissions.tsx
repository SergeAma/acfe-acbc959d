import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle, Clock, XCircle, Video, Mail, Phone, ArrowLeft, Eye } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface IdeaSubmission {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  idea_title: string;
  idea_description: string | null;
  video_url: string | null;
  video_filename: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export const AdminIdeaSubmissions = () => {
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<IdeaSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchSubmissions();
    }
  }, [profile]);

  const fetchSubmissions = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('idea_submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error fetching submissions",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSubmissions(data || []);
    }
    
    setLoading(false);
  };

  const sendStatusEmail = async (submission: IdeaSubmission, newStatus: string) => {
    try {
      const firstName = submission.full_name?.split(' ')[0] || 'Innovator';
      
      const { error } = await supabase.functions.invoke('send-idea-status-email', {
        body: {
          email: submission.email,
          first_name: firstName,
          idea_title: submission.idea_title,
          new_status: newStatus
        }
      });

      if (error) {
        console.error('Error sending status email:', error);
        toast({
          title: "Note",
          description: "Status updated but email notification failed to send.",
          variant: "default",
        });
      } else {
        console.log('Status email sent successfully');
      }
    } catch (err) {
      console.error('Failed to send status email:', err);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    
    const submission = submissions.find(s => s.id === id);
    const previousStatus = submission?.status;
    
    const { error } = await supabase
      .from('idea_submissions')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Status updated",
        description: `Submission status changed to ${newStatus}`,
      });
      
      // Send email notification if status actually changed
      if (submission && previousStatus !== newStatus) {
        await sendStatusEmail(submission, newStatus);
      }
      
      fetchSubmissions();
    }
    
    setUpdatingId(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-500/20"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'under_review':
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20"><Eye className="h-3 w-3 mr-1" />Under Review</Badge>;
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const filteredSubmissions = statusFilter === 'all' 
    ? submissions 
    : submissions.filter(s => s.status === statusFilter);

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

  const pendingCount = submissions.filter(s => s.status === 'pending').length;
  const approvedCount = submissions.filter(s => s.status === 'approved').length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          className="mb-6"
          onClick={() => navigate('/admin')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Idea Submissions</h1>
          <p className="text-muted-foreground">Review and manage startup idea submissions from innovators</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold">{submissions.length}</div>
              <p className="text-sm text-muted-foreground">Total Submissions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-yellow-600">{pendingCount}</div>
              <p className="text-sm text-muted-foreground">Pending Review</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-green-600">{approvedCount}</div>
              <p className="text-sm text-muted-foreground">Approved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold text-blue-600">
                {submissions.filter(s => s.status === 'under_review').length}
              </div>
              <p className="text-sm text-muted-foreground">Under Review</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-4 mb-6">
          <span className="text-sm text-muted-foreground">Filter by status:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All submissions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Submissions</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Submissions List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No submissions found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {filteredSubmissions.map((submission) => (
              <Card key={submission.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        {submission.idea_title}
                        {submission.video_url && (
                          <Video className="h-4 w-4 text-muted-foreground" />
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        by {submission.full_name}
                      </CardDescription>
                    </div>
                    {getStatusBadge(submission.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Contact Info */}
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <a href={`mailto:${submission.email}`} className="hover:text-foreground">
                          {submission.email}
                        </a>
                      </span>
                      {submission.phone && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          {submission.phone}
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {submission.idea_description && (
                      <div>
                        <h4 className="font-semibold mb-1 text-sm">Description:</h4>
                        <p className="text-muted-foreground text-sm">{submission.idea_description}</p>
                      </div>
                    )}

                    {/* Video */}
                    {submission.video_url && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={async () => {
                              // Generate signed URL if not already cached
                              if (!videoUrls[submission.id]) {
                                const { data, error } = await supabase.storage
                                  .from('idea-videos')
                                  .createSignedUrl(submission.video_url!, 3600); // 1 hour expiry
                                
                                if (data?.signedUrl) {
                                  setVideoUrls(prev => ({ ...prev, [submission.id]: data.signedUrl }));
                                } else if (error) {
                                  toast({
                                    title: "Error loading video",
                                    description: error.message,
                                    variant: "destructive",
                                  });
                                }
                              }
                            }}
                          >
                            <Video className="h-4 w-4 mr-2" />
                            Watch Pitch Video
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>{submission.idea_title} - Pitch Video</DialogTitle>
                          </DialogHeader>
                          {videoUrls[submission.id] ? (
                            <video 
                              controls 
                              className="w-full rounded-lg"
                              src={videoUrls[submission.id]}
                            >
                              Your browser does not support video playback.
                            </video>
                          ) : (
                            <div className="flex items-center justify-center py-12">
                              <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    )}

                    {/* Metadata & Actions */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <span className="text-sm text-muted-foreground">
                        Submitted: {new Date(submission.created_at).toLocaleDateString()} at{' '}
                        {new Date(submission.created_at).toLocaleTimeString()}
                      </span>
                      
                      <div className="flex items-center gap-2">
                        <Select 
                          value={submission.status}
                          onValueChange={(value) => updateStatus(submission.id, value)}
                          disabled={updatingId === submission.id}
                        >
                          <SelectTrigger className="w-[160px]">
                            {updatingId === submission.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <SelectValue />
                            )}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="under_review">Under Review</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
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
