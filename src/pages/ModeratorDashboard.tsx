import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate, useParams, Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Building2, Users, Loader2, Mail, ExternalLink, Download,
  FileText, Send, Ban, RotateCcw, Bell, Megaphone, Calendar,
  CheckCircle2, Eye, BarChart3, GraduationCap, Award
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useInstitutionStats } from '@/hooks/useCareerReadiness';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { StudentProfileDialog } from '@/components/admin/StudentProfileDialog';

export const ModeratorDashboard = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('overview');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isBroadcastDialogOpen, setIsBroadcastDialogOpen] = useState(false);
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [broadcast, setBroadcast] = useState({ subject: '', message: '' });
  const [reminder, setReminder] = useState({ title: '', description: '', reminder_date: '' });
  const [profileDialog, setProfileDialog] = useState<{ open: boolean; email: string; userId?: string | null }>({
    open: false,
    email: '',
    userId: null,
  });

  // Fetch institution by slug
  const { data: institution, isLoading: institutionLoading } = useQuery({
    queryKey: ['moderator-institution', slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from('institutions')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Check if user is moderator for this institution
  const { data: isModerator, isLoading: moderatorCheckLoading } = useQuery({
    queryKey: ['is-moderator', institution?.id, user?.id],
    queryFn: async () => {
      if (!institution?.id || !user?.id) return false;
      const { data, error } = await supabase
        .from('institution_moderators')
        .select('id')
        .eq('institution_id', institution.id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!institution?.id && !!user?.id,
  });

  const { data: stats } = useInstitutionStats(institution?.id);

  // Fetch students
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['moderator-students', institution?.id],
    queryFn: async () => {
      if (!institution?.id) return [];
      const { data, error } = await supabase
        .from('institution_students')
        .select('*')
        .eq('institution_id', institution.id)
        .order('invited_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!institution?.id && isModerator,
  });

  // Fetch reminders
  const { data: reminders = [] } = useQuery({
    queryKey: ['institution-reminders', institution?.id],
    queryFn: async () => {
      if (!institution?.id) return [];
      const { data, error } = await supabase
        .from('institution_reminders')
        .select('*')
        .eq('institution_id', institution.id)
        .order('reminder_date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!institution?.id && isModerator,
  });

  // Fetch broadcasts
  const { data: broadcasts = [] } = useQuery({
    queryKey: ['institution-broadcasts', institution?.id],
    queryFn: async () => {
      if (!institution?.id) return [];
      const { data, error } = await supabase
        .from('institution_broadcasts')
        .select('*')
        .eq('institution_id', institution.id)
        .order('sent_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!institution?.id && isModerator,
  });

  // Fetch events
  const { data: events = [] } = useQuery({
    queryKey: ['moderator-institution-events', institution?.id],
    queryFn: async () => {
      if (!institution?.id) return [];
      const { data, error } = await supabase
        .from('institution_events')
        .select('*')
        .eq('institution_id', institution.id)
        .order('event_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!institution?.id && isModerator,
  });

  // Invite students mutation
  const inviteStudentsMutation = useMutation({
    mutationFn: async (emails: string[]) => {
      const { data, error } = await supabase.functions.invoke('send-institution-invitation', {
        body: {
          institutionId: institution!.id,
          emails,
          institutionName: institution!.name,
          institutionSlug: institution!.slug
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['moderator-students'] });
      setIsInviteDialogOpen(false);
      setInviteEmails('');
      toast.success(`Invitations sent to ${data?.sent || 0} students`);
    },
    onError: () => toast.error('Failed to send invitations'),
  });

  // Send broadcast mutation
  const sendBroadcastMutation = useMutation({
    mutationFn: async (data: typeof broadcast) => {
      const activeStudentEmails = students
        .filter(s => s.status === 'active')
        .map(s => s.email);

      // Store broadcast record
      const { error } = await supabase
        .from('institution_broadcasts')
        .insert({
          institution_id: institution!.id,
          subject: data.subject,
          message: data.message,
          sent_by: user!.id,
          recipient_count: activeStudentEmails.length,
        });
      if (error) throw error;

      // Note: Actual email sending would be done via edge function
      // For now, we just record the broadcast
      return { count: activeStudentEmails.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['institution-broadcasts'] });
      setIsBroadcastDialogOpen(false);
      setBroadcast({ subject: '', message: '' });
      toast.success(`Broadcast recorded for ${data.count} students`);
    },
    onError: () => toast.error('Failed to send broadcast'),
  });

  // Create reminder mutation
  const createReminderMutation = useMutation({
    mutationFn: async (data: typeof reminder) => {
      const { error } = await supabase
        .from('institution_reminders')
        .insert({
          institution_id: institution!.id,
          title: data.title,
          description: data.description || null,
          reminder_date: data.reminder_date,
          created_by: user!.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institution-reminders'] });
      setIsReminderDialogOpen(false);
      setReminder({ title: '', description: '', reminder_date: '' });
      toast.success('Reminder created');
    },
    onError: () => toast.error('Failed to create reminder'),
  });

  // Toggle reminder completion
  const toggleReminderMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from('institution_reminders')
        .update({ is_completed: completed })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institution-reminders'] });
    },
  });

  // Revoke/Reinstate mutations
  const revokeAccessMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await supabase
        .from('institution_students')
        .update({ status: 'revoked', joined_at: null })
        .eq('id', studentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderator-students'] });
      toast.success('Access revoked');
    },
  });

  const reinstateAccessMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await supabase
        .from('institution_students')
        .update({ status: 'active', joined_at: new Date().toISOString() })
        .eq('id', studentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderator-students'] });
      toast.success('Access reinstated');
    },
  });

  // Resend invitation
  const resendInvitationMutation = useMutation({
    mutationFn: async (email: string) => {
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-institution-invitation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session?.access_token}`,
        },
        body: JSON.stringify({
          institutionId: institution!.id,
          emails: [email],
          institutionName: institution!.name,
          institutionSlug: institution!.slug,
        }),
      });
      if (!response.ok) throw new Error('Failed to resend invitation');
      return response.json();
    },
    onSuccess: () => toast.success('Invitation resent'),
    onError: () => toast.error('Failed to resend invitation'),
  });

  // Export CSV
  const exportStudentActivity = () => {
    if (!institution || !stats) return;

    const activeStudents = students.filter(s => s.status === 'active').length;
    const pendingStudents = students.filter(s => s.status === 'pending').length;

    const reportData = [
      ['Institution Activity Report', institution.name],
      ['Generated by Moderator', format(new Date(), 'PPpp')],
      [''],
      ['Metric', 'Value'],
      ['Total Students', stats.totalStudents?.toString() || '0'],
      ['Active Students', activeStudents.toString()],
      ['Pending Invitations', pendingStudents.toString()],
      ['Course Enrollments', stats.totalEnrollments?.toString() || '0'],
      ['Courses Completed', stats.totalCompletedCourses?.toString() || '0'],
      ['Certificates Issued', stats.totalCertificates?.toString() || '0'],
      [''],
      ['Student List'],
      ['Email', 'Status', 'Invited', 'Joined'],
      ...students.map(s => [
        s.email,
        s.status,
        s.invited_at ? format(new Date(s.invited_at), 'yyyy-MM-dd') : '',
        s.joined_at ? format(new Date(s.joined_at), 'yyyy-MM-dd') : ''
      ])
    ];

    const csvContent = reportData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${institution.slug}-activity-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    toast.success('Activity report exported');
  };

  // Calculate stats
  const activeStudents = students.filter(s => s.status === 'active').length;
  const pendingInvites = students.filter(s => s.status === 'pending').length;
  const upcomingReminders = reminders.filter(r => !r.is_completed && new Date(r.reminder_date) >= new Date()).length;

  if (authLoading || institutionLoading || moderatorCheckLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!institution) {
    return <Navigate to="/" replace />;
  }

  if (!isModerator) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You are not a moderator for this institution.
          </p>
          <Button asChild>
            <Link to="/">Go Home</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageBreadcrumb items={[
        { label: institution.name, href: `/career-centre/${institution.slug}` },
        { label: "Moderator Dashboard" }
      ]} />

      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                {institution.logo_url ? (
                  <img src={institution.logo_url} alt="" className="h-14 w-14 object-contain rounded-lg border" />
                ) : (
                  <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center border">
                    <Building2 className="h-7 w-7 text-primary" />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{institution.name}</h1>
                  <p className="text-muted-foreground flex items-center gap-2">
                    <Badge variant="secondary">Moderator</Badge>
                    <Link
                      to={`/career-centre/${institution.slug}`}
                      className="text-primary hover:underline text-sm inline-flex items-center gap-1"
                    >
                      View Career Centre <ExternalLink className="h-3 w-3" />
                    </Link>
                  </p>
                </div>
              </div>
              <Button onClick={exportStudentActivity} className="rounded-full">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-2xl font-bold">{activeStudents}</div>
                  <div className="text-xs text-muted-foreground">Active Students</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Mail className="h-5 w-5 mx-auto mb-1 text-amber-500" />
                  <div className="text-2xl font-bold text-amber-600">{pendingInvites}</div>
                  <div className="text-xs text-muted-foreground">Pending Invites</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <GraduationCap className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-2xl font-bold">{stats?.totalEnrollments || 0}</div>
                  <div className="text-xs text-muted-foreground">Enrollments</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Award className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-2xl font-bold">{stats?.totalCertificates || 0}</div>
                  <div className="text-xs text-muted-foreground">Certificates</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Bell className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-2xl font-bold">{upcomingReminders}</div>
                  <div className="text-xs text-muted-foreground">Reminders</div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <Card>
              <CardContent className="p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="students">Students</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                    <TabsTrigger value="broadcasts">Broadcasts</TabsTrigger>
                    <TabsTrigger value="reminders">Reminders</TabsTrigger>
                  </TabsList>

                  {/* Overview Tab */}
                  <TabsContent value="overview">
                    <div className="grid lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="font-semibold flex items-center gap-2">
                          <BarChart3 className="h-5 w-5" />
                          Quick Actions
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          <Button variant="outline" onClick={() => setIsInviteDialogOpen(true)} className="h-auto py-4 flex-col">
                            <Mail className="h-5 w-5 mb-1" />
                            <span className="text-sm">Invite Students</span>
                          </Button>
                          <Button variant="outline" onClick={() => setIsBroadcastDialogOpen(true)} className="h-auto py-4 flex-col">
                            <Megaphone className="h-5 w-5 mb-1" />
                            <span className="text-sm">Send Broadcast</span>
                          </Button>
                          <Button variant="outline" onClick={() => setIsReminderDialogOpen(true)} className="h-auto py-4 flex-col">
                            <Bell className="h-5 w-5 mb-1" />
                            <span className="text-sm">Set Reminder</span>
                          </Button>
                          <Button variant="outline" onClick={exportStudentActivity} className="h-auto py-4 flex-col">
                            <Download className="h-5 w-5 mb-1" />
                            <span className="text-sm">Export Data</span>
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          Upcoming Events
                        </h3>
                        {events.filter(e => new Date(e.event_date) >= new Date()).slice(0, 3).length === 0 ? (
                          <p className="text-sm text-muted-foreground">No upcoming events</p>
                        ) : (
                          <div className="space-y-2">
                            {events.filter(e => new Date(e.event_date) >= new Date()).slice(0, 3).map(event => (
                              <div key={event.id} className="p-3 rounded-lg border text-sm">
                                <p className="font-medium">{event.title}</p>
                                {event.event_date && (
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(event.event_date), 'MMM d, yyyy HH:mm')}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {/* Students Tab */}
                  <TabsContent value="students">
                    <div className="flex justify-between mb-4">
                      <p className="text-sm text-muted-foreground">
                        Total: {students.length} students
                      </p>
                      <Button size="sm" onClick={() => setIsInviteDialogOpen(true)} className="rounded-full">
                        <Mail className="h-4 w-4 mr-2" />
                        Invite Students
                      </Button>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Invited</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentsLoading ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8">
                              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                            </TableCell>
                          </TableRow>
                        ) : students.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              No students yet
                            </TableCell>
                          </TableRow>
                        ) : students.map(student => (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">{student.email}</TableCell>
                            <TableCell>
                              <Badge variant={
                                student.status === 'active' ? 'default' :
                                student.status === 'pending' ? 'secondary' : 'destructive'
                              }>
                                {student.status === 'active' ? 'Active' :
                                 student.status === 'pending' ? 'Pending' : 'Revoked'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {student.invited_at ? format(new Date(student.invited_at), 'MMM d, yyyy') : '-'}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {student.joined_at ? format(new Date(student.joined_at), 'MMM d, yyyy') : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setProfileDialog({ open: true, email: student.email, userId: student.user_id })}
                                  title="View profile"
                                >
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                </Button>
                                {student.status === 'pending' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => resendInvitationMutation.mutate(student.email)}
                                    title="Resend invitation"
                                  >
                                    <Send className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                )}
                                {(student.status === 'active' || student.status === 'pending') && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => revokeAccessMutation.mutate(student.id)}
                                    title="Revoke access"
                                  >
                                    <Ban className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                                {student.status === 'revoked' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => reinstateAccessMutation.mutate(student.id)}
                                    title="Reinstate access"
                                  >
                                    <RotateCcw className="h-4 w-4 text-green-600" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>

                  {/* Activity Tab */}
                  <TabsContent value="activity">
                    <div className="space-y-6">
                      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-4 rounded-lg bg-muted/50 text-center">
                          <div className="text-2xl font-bold">{stats?.totalStudents || 0}</div>
                          <div className="text-xs text-muted-foreground">Total Students</div>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/50 text-center">
                          <div className="text-2xl font-bold">{stats?.totalEnrollments || 0}</div>
                          <div className="text-xs text-muted-foreground">Course Enrollments</div>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/50 text-center">
                          <div className="text-2xl font-bold">{stats?.totalCompletedCourses || 0}</div>
                          <div className="text-xs text-muted-foreground">Courses Completed</div>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/50 text-center">
                          <div className="text-2xl font-bold">{stats?.spectrogramProfiles || 0}</div>
                          <div className="text-xs text-muted-foreground">Talent Profiles</div>
                        </div>
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Metric</TableHead>
                            <TableHead className="text-right">Value</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              Active Students
                            </TableCell>
                            <TableCell className="text-right">{activeStudents}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              Pending Invitations
                            </TableCell>
                            <TableCell className="text-right">{pendingInvites}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium flex items-center gap-2">
                              <Award className="h-4 w-4 text-muted-foreground" />
                              Certificates Issued
                            </TableCell>
                            <TableCell className="text-right">{stats?.totalCertificates || 0}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>

                  {/* Broadcasts Tab */}
                  <TabsContent value="broadcasts">
                    <div className="flex justify-between mb-4">
                      <p className="text-sm text-muted-foreground">
                        Send messages to all active students
                      </p>
                      <Button size="sm" onClick={() => setIsBroadcastDialogOpen(true)} className="rounded-full">
                        <Megaphone className="h-4 w-4 mr-2" />
                        New Broadcast
                      </Button>
                    </div>

                    {broadcasts.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No broadcasts sent yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {broadcasts.map(b => (
                          <div key={b.id} className="p-4 rounded-lg border">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">{b.subject}</h4>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(b.sent_at), 'MMM d, yyyy HH:mm')}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{b.message}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Sent to {b.recipient_count} students
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Reminders Tab */}
                  <TabsContent value="reminders">
                    <div className="flex justify-between mb-4">
                      <p className="text-sm text-muted-foreground">
                        Set reminders for follow-ups and tasks
                      </p>
                      <Button size="sm" onClick={() => setIsReminderDialogOpen(true)} className="rounded-full">
                        <Bell className="h-4 w-4 mr-2" />
                        Add Reminder
                      </Button>
                    </div>

                    {reminders.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No reminders set</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {reminders.map(r => (
                          <div key={r.id} className={`p-3 rounded-lg border flex items-center gap-3 ${r.is_completed ? 'opacity-50' : ''}`}>
                            <Checkbox
                              checked={r.is_completed}
                              onCheckedChange={(checked) => 
                                toggleReminderMutation.mutate({ id: r.id, completed: !!checked })
                              }
                            />
                            <div className="flex-1">
                              <p className={`font-medium ${r.is_completed ? 'line-through' : ''}`}>{r.title}</p>
                              {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
                            </div>
                            <Badge variant={new Date(r.reminder_date) < new Date() ? 'destructive' : 'secondary'}>
                              {format(new Date(r.reminder_date), 'MMM d, yyyy')}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Dialogs */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Students</DialogTitle>
            <DialogDescription>
              Enter email addresses (one per line) to invite students to {institution.name}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={inviteEmails}
            onChange={(e) => setInviteEmails(e.target.value)}
            placeholder="student1@university.edu&#10;student2@university.edu"
            className="min-h-[150px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                const emails = inviteEmails.split('\n').map(e => e.trim()).filter(Boolean);
                if (emails.length === 0) {
                  toast.error('Please enter at least one email');
                  return;
                }
                inviteStudentsMutation.mutate(emails);
              }}
              disabled={inviteStudentsMutation.isPending}
            >
              {inviteStudentsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Invitations
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBroadcastDialogOpen} onOpenChange={setIsBroadcastDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Broadcast Message</DialogTitle>
            <DialogDescription>
              This message will be sent to all {activeStudents} active students
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Subject *</Label>
              <Input
                value={broadcast.subject}
                onChange={(e) => setBroadcast(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Important announcement..."
              />
            </div>
            <div>
              <Label>Message *</Label>
              <Textarea
                value={broadcast.message}
                onChange={(e) => setBroadcast(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Your message to all students..."
                className="min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBroadcastDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => sendBroadcastMutation.mutate(broadcast)}
              disabled={!broadcast.subject || !broadcast.message || sendBroadcastMutation.isPending}
            >
              {sendBroadcastMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Broadcast
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Reminder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={reminder.title}
                onChange={(e) => setReminder(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Follow up with students..."
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={reminder.description}
                onChange={(e) => setReminder(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Additional details..."
              />
            </div>
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={reminder.reminder_date}
                onChange={(e) => setReminder(prev => ({ ...prev, reminder_date: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReminderDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createReminderMutation.mutate(reminder)}
              disabled={!reminder.title || !reminder.reminder_date || createReminderMutation.isPending}
            >
              {createReminderMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StudentProfileDialog
        open={profileDialog.open}
        onOpenChange={(open) => setProfileDialog({ ...profileDialog, open })}
        studentEmail={profileDialog.email}
        studentUserId={profileDialog.userId}
      />

      <Footer />
    </div>
  );
};

export default ModeratorDashboard;
