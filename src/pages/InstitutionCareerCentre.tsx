import { useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Building2, Calendar, Briefcase, MessageSquare, Award, 
  ExternalLink, Loader2, Shield, Send, GraduationCap, 
  CheckCircle2, Clock, Users, Sparkles, ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useInstitutionBySlug, 
  useInstitutionMembership,
  useInstitutionEvents,
  useInstitutionAnnouncements,
  useInstitutionThreads
} from '@/hooks/useInstitution';
import { useCareerReadiness } from '@/hooks/useCareerReadiness';
import { toast } from 'sonner';
import { formatDistanceToNow, format, isPast } from 'date-fns';

const threadTypeLabels = {
  role: 'Job Discussion',
  event: 'Event Follow-up',
  course_followup: 'Course Discussion'
};

const threadTypeColors = {
  role: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  event: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  course_followup: 'bg-green-500/10 text-green-600 border-green-500/20'
};

export const InstitutionCareerCentre = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, profile, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [newThreadContent, setNewThreadContent] = useState('');
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadType, setNewThreadType] = useState<string>('course_followup');
  const [isCreatingSpectrogram, setIsCreatingSpectrogram] = useState(false);

  const { data: institution, isLoading: institutionLoading } = useInstitutionBySlug(slug);
  const { data: membership, isLoading: membershipLoading } = useInstitutionMembership(institution?.id);
  const { data: events = [] } = useInstitutionEvents(institution?.id);
  const { data: announcements = [] } = useInstitutionAnnouncements(institution?.id);
  const { data: threads = [] } = useInstitutionThreads(institution?.id);
  const { data: careerReadiness } = useCareerReadiness();

  // Fetch thread authors
  const { data: threadAuthors = {} } = useQuery({
    queryKey: ['thread-authors', threads.map(t => t.author_id)],
    queryFn: async () => {
      const authorIds = [...new Set(threads.map(t => t.author_id).filter(Boolean))];
      if (!authorIds.length) return {};
      
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', authorIds);
      
      return Object.fromEntries((data || []).map(p => [p.id, p.full_name]));
    },
    enabled: threads.length > 0,
  });

  // Create thread mutation
  const createThreadMutation = useMutation({
    mutationFn: async ({ title, content, type }: { title: string; content: string; type: string }) => {
      const { error } = await supabase
        .from('institution_threads')
        .insert({
          institution_id: institution!.id,
          author_id: user!.id,
          title,
          content,
          thread_type: type
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institution-threads'] });
      setNewThreadTitle('');
      setNewThreadContent('');
      toast.success('Thread created successfully');
    },
    onError: () => toast.error('Failed to create thread'),
  });

  const handleCreateSpectrogram = async () => {
    setIsCreatingSpectrogram(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-spectrogram-token', {});
      if (error) throw error;
      if (data?.redirectUrl) {
        window.open(data.redirectUrl, '_blank');
        toast.success('Redirecting to Spectrogram...');
      }
    } catch (error) {
      toast.error('Failed to create Spectrogram profile');
    } finally {
      setIsCreatingSpectrogram(false);
    }
  };

  // Loading states
  if (authLoading || institutionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not found
  if (!institution) {
    return <Navigate to="/not-found" replace />;
  }

  // Auth gate - must be logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Access Restricted</h2>
              <p className="text-muted-foreground text-sm">
                Sign in to access the {institution.name} Career Centre.
              </p>
              <div className="flex flex-col gap-3 pt-2">
                <Button asChild className="rounded-full">
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button variant="outline" asChild className="rounded-full">
                  <Link to="/auth">Create Account</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  // Membership gate - must be verified member
  if (!membershipLoading && !membership) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-lg mx-auto">
            <CardContent className="p-8 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
                <Shield className="h-8 w-8 text-amber-500" />
              </div>
              <h2 className="text-xl font-bold">Membership Required</h2>
              <p className="text-muted-foreground text-sm">
                This Career Centre is exclusively for verified students of <strong>{institution.name}</strong>.
              </p>
              <p className="text-muted-foreground text-sm">
                If you're a student, please contact your institution to request access using your institutional email address.
              </p>
              <Button variant="outline" asChild className="rounded-full">
                <Link to="/dashboard">Return to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  const upcomingEvents = events.filter(e => e.event_date && !isPast(new Date(e.event_date)));
  const pastEvents = events.filter(e => e.event_date && isPast(new Date(e.event_date)));
  const pinnedAnnouncements = announcements.filter(a => a.is_pinned);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageBreadcrumb items={[
        { label: "Career Centre", href: "/career-centre" },
        { label: institution.name }
      ]} />

      {/* Hero Section with Institution Branding */}
      <section className="relative border-b border-border py-8 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-6 max-w-4xl mx-auto">
            {institution.logo_url ? (
              <img 
                src={institution.logo_url} 
                alt={institution.name}
                className="h-20 w-20 object-contain rounded-lg bg-background p-2 border"
              />
            ) : (
              <div className="h-20 w-20 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-10 w-10 text-primary" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Verified Student
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                {institution.name} Career Centre
              </h1>
              <p className="text-muted-foreground mt-1">
                Your exclusive gateway to career opportunities and professional development
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-4 mb-8">
                <TabsTrigger value="overview" className="text-xs sm:text-sm">
                  <GraduationCap className="h-4 w-4 mr-1 hidden sm:inline" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="opportunities" className="text-xs sm:text-sm">
                  <Briefcase className="h-4 w-4 mr-1 hidden sm:inline" />
                  Jobs
                </TabsTrigger>
                <TabsTrigger value="events" className="text-xs sm:text-sm">
                  <Calendar className="h-4 w-4 mr-1 hidden sm:inline" />
                  Events
                </TabsTrigger>
                <TabsTrigger value="discussions" className="text-xs sm:text-sm">
                  <MessageSquare className="h-4 w-4 mr-1 hidden sm:inline" />
                  Discuss
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Pinned Announcements */}
                {pinnedAnnouncements.length > 0 && (
                  <div className="space-y-3">
                    {pinnedAnnouncements.map(announcement => (
                      <Card key={announcement.id} className="border-primary/20 bg-primary/5">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <div>
                              <h3 className="font-semibold text-foreground">{announcement.title}</h3>
                              <p className="text-sm text-muted-foreground mt-1">{announcement.content}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Career Readiness Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-primary" />
                      Your Career Readiness
                    </CardTitle>
                    <CardDescription>
                      Progress derived from your ACFE activity
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 rounded-lg bg-muted/50 text-center">
                        <div className="text-2xl font-bold text-foreground">{careerReadiness?.completedCourses || 0}</div>
                        <div className="text-xs text-muted-foreground">Courses Completed</div>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50 text-center">
                        <div className="text-2xl font-bold text-foreground">{careerReadiness?.certificates || 0}</div>
                        <div className="text-xs text-muted-foreground">Certificates Earned</div>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50 text-center">
                        <div className="text-2xl font-bold text-foreground">{careerReadiness?.assignmentsSubmitted || 0}</div>
                        <div className="text-xs text-muted-foreground">Assignments Approved</div>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50 text-center">
                        <div className="text-2xl font-bold text-foreground">{careerReadiness?.quizzesPassed || 0}</div>
                        <div className="text-xs text-muted-foreground">Quizzes Passed</div>
                      </div>
                    </div>

                    {/* Spectrogram CTA */}
                    <div className="mt-6 p-4 rounded-lg border border-border bg-background">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center shrink-0">
                          <Users className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">Join the Talent Network</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Create your Spectrogram Consulting talent profile to be discovered by employers and access exclusive opportunities.
                          </p>
                          {careerReadiness?.spectrogramProfileCreated ? (
                            <Badge className="mt-2 bg-green-500/10 text-green-600 border-green-500/20">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Profile Created
                            </Badge>
                          ) : (
                            <Button 
                              size="sm" 
                              className="mt-3 rounded-full"
                              onClick={handleCreateSpectrogram}
                              disabled={isCreatingSpectrogram || !careerReadiness?.isCareerReady}
                            >
                              {isCreatingSpectrogram ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <ArrowRight className="h-4 w-4 mr-2" />
                              )}
                              Create Talent Profile
                            </Button>
                          )}
                          {!careerReadiness?.isCareerReady && !careerReadiness?.spectrogramProfileCreated && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Complete at least 1 course and earn a certificate to unlock.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Upcoming Events Preview */}
                {upcomingEvents.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        Upcoming Events
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {upcomingEvents.slice(0, 3).map(event => (
                          <div key={event.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                            <div className="text-center shrink-0">
                              <div className="text-lg font-bold text-foreground">
                                {format(new Date(event.event_date!), 'd')}
                              </div>
                              <div className="text-xs text-muted-foreground uppercase">
                                {format(new Date(event.event_date!), 'MMM')}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-foreground truncate">{event.title}</h4>
                              {event.description && (
                                <p className="text-sm text-muted-foreground truncate">{event.description}</p>
                              )}
                            </div>
                            {event.event_url && (
                              <Button variant="outline" size="sm" asChild className="shrink-0">
                                <a href={event.event_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                      {upcomingEvents.length > 3 && (
                        <Button 
                          variant="ghost" 
                          className="w-full mt-3"
                          onClick={() => setActiveTab('events')}
                        >
                          View All Events
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Opportunities Tab */}
              <TabsContent value="opportunities" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Available Opportunities</CardTitle>
                    <CardDescription>
                      Jobs and opportunities available to {institution.name} students
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Check back soon for exclusive opportunities curated for your institution.
                      </p>
                      <Button variant="outline" asChild className="mt-4 rounded-full">
                        <Link to="/jobs">Browse All ACFE Jobs</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Events Tab */}
              <TabsContent value="events" className="space-y-6">
                {upcomingEvents.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Upcoming Events</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {upcomingEvents.map(event => (
                        <div key={event.id} className="flex items-start gap-4 p-4 rounded-lg border">
                          <div className="text-center shrink-0 bg-muted rounded-lg p-2 min-w-[60px]">
                            <div className="text-xl font-bold text-foreground">
                              {format(new Date(event.event_date!), 'd')}
                            </div>
                            <div className="text-xs text-muted-foreground uppercase">
                              {format(new Date(event.event_date!), 'MMM yyyy')}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-foreground">{event.title}</h4>
                              {event.is_pinned && (
                                <Badge variant="outline" className="text-xs">Featured</Badge>
                              )}
                            </div>
                            {event.description && (
                              <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                            )}
                            {event.event_url && (
                              <Button variant="link" size="sm" asChild className="px-0 mt-2">
                                <a href={event.event_url} target="_blank" rel="noopener noreferrer">
                                  Learn More <ExternalLink className="h-3 w-3 ml-1" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {pastEvents.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-muted-foreground">Past Events</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {pastEvents.slice(0, 5).map(event => (
                        <div key={event.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 opacity-70">
                          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex-1">
                            <span className="text-sm text-foreground">{event.title}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {format(new Date(event.event_date!), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {events.length === 0 && (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No events scheduled yet.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Discussions Tab */}
              <TabsContent value="discussions" className="space-y-6">
                {/* Create Thread Form */}
                <Card>
                  <CardContent className="p-5">
                    <div className="space-y-4">
                      <input
                        type="text"
                        placeholder="Thread title..."
                        value={newThreadTitle}
                        onChange={(e) => setNewThreadTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground"
                        maxLength={200}
                      />
                      <Textarea
                        placeholder="Share about a role, event, or course discussion..."
                        value={newThreadContent}
                        onChange={(e) => setNewThreadContent(e.target.value)}
                        className="min-h-[100px] resize-none"
                      />
                      <div className="flex items-center justify-between gap-4">
                        <Select value={newThreadType} onValueChange={setNewThreadType}>
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Thread type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="role">💼 Job Discussion</SelectItem>
                            <SelectItem value="event">📅 Event Follow-up</SelectItem>
                            <SelectItem value="course_followup">📚 Course Discussion</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          onClick={() => {
                            if (!newThreadTitle.trim() || !newThreadContent.trim()) {
                              toast.error('Please provide both title and content');
                              return;
                            }
                            createThreadMutation.mutate({
                              title: newThreadTitle.trim(),
                              content: newThreadContent.trim(),
                              type: newThreadType
                            });
                          }}
                          disabled={createThreadMutation.isPending || !newThreadTitle.trim() || !newThreadContent.trim()}
                          className="rounded-full"
                        >
                          {createThreadMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          Post
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Threads List */}
                {threads.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No discussions yet. Start the conversation!</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {threads.map(thread => (
                      <Card key={thread.id} className="hover:border-primary/50 transition-colors">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                <span className="text-xs font-semibold">
                                  {(threadAuthors[thread.author_id] || 'A').charAt(0)}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  {threadAuthors[thread.author_id] || 'Anonymous'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className={threadTypeColors[thread.thread_type as keyof typeof threadTypeColors]}>
                              {threadTypeLabels[thread.thread_type as keyof typeof threadTypeLabels]}
                            </Badge>
                          </div>
                          <h4 className="font-semibold text-foreground mb-2">{thread.title}</h4>
                          <p className="text-sm text-foreground/90 whitespace-pre-wrap">{thread.content}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default InstitutionCareerCentre;
