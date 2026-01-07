import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Users, UserCheck, Clock, MessageSquare, BookOpen, CheckCircle, GraduationCap, Loader2, Building2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useMentorContract } from '@/hooks/useMentorContract';

interface MentorshipRequest {
  id: string;
  student_id: string;
  student_bio: string;
  career_ambitions: string;
  reason_for_mentor: string;
  status: string;
  mentor_response: string | null;
  course_to_complete_id: string | null;
  created_at: string;
  responded_at: string | null;
  student_profile?: {
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  };
}

interface Course {
  id: string;
  title: string;
}

export const MentorCohort = () => {
  const { user, profile, loading: authLoading, isActualAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<MentorshipRequest | null>(null);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [responseType, setResponseType] = useState<'accept' | 'course_required'>('accept');
  const [responseMessage, setResponseMessage] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [responding, setResponding] = useState(false);
  const [selectedCohortView, setSelectedCohortView] = useState<'general' | string>('general');
  const { hasSignedContract, loading: contractLoading } = useMentorContract(user?.id);

  // Fetch institution cohorts for this mentor
  const { data: institutionCohorts } = useQuery({
    queryKey: ['mentor-institution-cohorts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('institution_cohorts')
        .select(`
          id,
          name,
          institution_id,
          institutions!inner (
            name,
            logo_url
          )
        `)
        .eq('mentor_id', user.id)
        .eq('is_active', true);
      
      if (error) throw error;
      
      return (data || []).map(cohort => ({
        id: cohort.id,
        name: cohort.name,
        institution_id: cohort.institution_id,
        institution: {
          name: (cohort.institutions as any).name,
          logo_url: (cohort.institutions as any).logo_url,
        }
      }));
    },
    enabled: !!user,
  });

  // Redirect if not a mentor
  useEffect(() => {
    if (!authLoading && profile && profile.role !== 'mentor' && profile.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [authLoading, profile, navigate]);

  // Redirect mentors who haven't signed contract
  useEffect(() => {
    if (!contractLoading && profile?.role === 'mentor' && !isActualAdmin && hasSignedContract === false) {
      navigate('/mentor-contract');
    }
  }, [contractLoading, profile, isActualAdmin, hasSignedContract, navigate]);

  // Fetch mentorship requests
  const { data: requests, isLoading: requestsLoading, refetch: refetchRequests } = useQuery({
    queryKey: ['mentor-requests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('mentorship_requests')
        .select('*')
        .eq('mentor_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch student profiles
      const studentIds = data.map(r => r.student_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', studentIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return data.map(request => ({
        ...request,
        student_profile: profileMap.get(request.student_id)
      })) as MentorshipRequest[];
    },
    enabled: !!user,
  });

  // Fetch mentor's courses for the course requirement option
  const { data: mentorCourses } = useQuery({
    queryKey: ['mentor-courses-for-cohort', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('courses')
        .select('id, title')
        .eq('mentor_id', user.id)
        .eq('is_published', true);

      if (error) throw error;
      return data as Course[];
    },
    enabled: !!user,
  });

  const pendingRequests = requests?.filter(r => r.status === 'pending') || [];
  const acceptedMentees = requests?.filter(r => r.status === 'accepted') || [];
  const courseRequiredMentees = requests?.filter(r => r.status === 'course_required') || [];

  const handleRespond = async () => {
    if (!selectedRequest) return;

    if (responseType === 'course_required' && !selectedCourse) {
      toast({
        title: 'Please select a course',
        variant: 'destructive'
      });
      return;
    }

    setResponding(true);
    try {
      const updateData: any = {
        status: responseType,
        mentor_response: responseMessage || null,
        responded_at: new Date().toISOString()
      };

      if (responseType === 'course_required') {
        updateData.course_to_complete_id = selectedCourse;
      }

      const { error } = await supabase
        .from('mentorship_requests')
        .update(updateData)
        .eq('id', selectedRequest.id);

      if (error) throw error;

      // Send notification email to student
      try {
        await supabase.functions.invoke('send-mentorship-response-notification', {
          body: {
            studentId: selectedRequest.student_id,
            mentorName: profile?.full_name,
            status: responseType,
            message: responseMessage,
            courseId: responseType === 'course_required' ? selectedCourse : null
          }
        });
      } catch (emailError) {
        // Email notification failed, but the response was saved
      }

      toast({
        title: responseType === 'accept' ? 'Mentee Accepted!' : 'Course Requirement Sent',
        description: responseType === 'accept' 
          ? 'The student has been added to your cohort.'
          : 'The student will be notified to complete the course.'
      });

      setResponseDialogOpen(false);
      setSelectedRequest(null);
      setResponseMessage('');
      setSelectedCourse('');
      refetchRequests();
    } catch (error: any) {
      toast({
        title: 'Failed to respond',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setResponding(false);
    }
  };

  if (authLoading || contractLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageBreadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: "My Cohort" }]} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Mentorship Cohort</h1>
            <p className="text-muted-foreground mt-1">Manage your mentees and mentorship requests</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Cohort Selector */}
            {institutionCohorts && institutionCohorts.length > 0 && (
              <Select value={selectedCohortView} onValueChange={setSelectedCohortView}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Select cohort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>General Cohort</span>
                    </div>
                  </SelectItem>
                  {institutionCohorts.map((cohort) => (
                    <SelectItem key={cohort.id} value={cohort.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        <span>{cohort.institution.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button onClick={() => navigate('/mentor/cohort/community')}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Community Board
            </Button>
          </div>
        </div>

        {/* Institution Cohort Banner */}
        {selectedCohortView !== 'general' && institutionCohorts && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">
                    {institutionCohorts.find(c => c.id === selectedCohortView)?.institution.name} Cohort
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Institution-specific cohort - members from this institution only
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{pendingRequests.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Mentees</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{acceptedMentees.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completing Courses</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{courseRequiredMentees.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pending ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="accepted" className="gap-2">
              <UserCheck className="h-4 w-4" />
              My Cohort ({acceptedMentees.length})
            </TabsTrigger>
            <TabsTrigger value="course_required" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Course Required ({courseRequiredMentees.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {requestsLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : pendingRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No pending requests</h3>
                  <p className="text-muted-foreground">
                    When students request to join your cohort, they'll appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingRequests.map((request) => (
                  <Card key={request.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={request.student_profile?.avatar_url || undefined} />
                          <AvatarFallback>
                            {request.student_profile?.full_name?.charAt(0) || 'S'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">
                              {request.student_profile?.full_name || 'Anonymous Student'}
                            </h3>
                            <Badge variant="outline" className="text-xs">
                              {format(new Date(request.created_at), 'MMM d, yyyy')}
                            </Badge>
                          </div>
                          <div className="space-y-3 text-sm">
                            <div>
                              <span className="font-medium text-muted-foreground">Bio: </span>
                              <span>{request.student_bio}</span>
                            </div>
                            <div>
                              <span className="font-medium text-muted-foreground">Career Ambitions: </span>
                              <span>{request.career_ambitions}</span>
                            </div>
                            <div>
                              <span className="font-medium text-muted-foreground">Why you: </span>
                              <span>{request.reason_for_mentor}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => {
                            setSelectedRequest(request);
                            setResponseDialogOpen(true);
                          }}
                        >
                          Respond
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="accepted">
            {acceptedMentees.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No mentees yet</h3>
                  <p className="text-muted-foreground">
                    Accept mentorship requests to grow your cohort.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {acceptedMentees.map((mentee) => (
                  <Card key={mentee.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={mentee.student_profile?.avatar_url || undefined} />
                          <AvatarFallback>
                            {mentee.student_profile?.full_name?.charAt(0) || 'S'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">
                            {mentee.student_profile?.full_name || 'Anonymous'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Joined {format(new Date(mentee.responded_at || mentee.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {mentee.career_ambitions}
                      </p>
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active Mentee
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="course_required">
            {courseRequiredMentees.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No students in progress</h3>
                  <p className="text-muted-foreground">
                    Students completing prerequisite courses will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courseRequiredMentees.map((mentee) => (
                  <Card key={mentee.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={mentee.student_profile?.avatar_url || undefined} />
                          <AvatarFallback>
                            {mentee.student_profile?.full_name?.charAt(0) || 'S'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">
                            {mentee.student_profile?.full_name || 'Anonymous'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Requested {format(new Date(mentee.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        <BookOpen className="h-3 w-3 mr-1" />
                        Completing Course
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Response Dialog */}
      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to {selectedRequest?.student_profile?.full_name}</DialogTitle>
            <DialogDescription>
              Choose how to respond to this mentorship request.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Response Type</Label>
              <Select value={responseType} onValueChange={(v: 'accept' | 'course_required') => setResponseType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="accept">Accept into Cohort</SelectItem>
                  <SelectItem value="course_required">Recommend Course First</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {responseType === 'course_required' && (
              <div className="space-y-2">
                <Label>Select Course to Complete</Label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a course..." />
                  </SelectTrigger>
                  <SelectContent>
                    {mentorCourses?.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Personal Message (Optional)</Label>
              <Textarea
                placeholder="Add a personal note to your response..."
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setResponseDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRespond} disabled={responding}>
                {responding ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  responseType === 'accept' ? 'Accept Mentee' : 'Send Recommendation'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};
