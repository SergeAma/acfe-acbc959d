import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { 
  Building2, Plus, Users, Calendar, Megaphone, Loader2, 
  Trash2, Mail, ExternalLink, BarChart3, CheckCircle2, XCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAllInstitutions, Institution } from '@/hooks/useInstitution';
import { useInstitutionStats } from '@/hooks/useCareerReadiness';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Navigate, Link } from 'react-router-dom';

export const AdminInstitutions = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isAnnouncementDialogOpen, setIsAnnouncementDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Form states
  const [newInstitution, setNewInstitution] = useState({ name: '', slug: '', email_domain: '', description: '' });
  const [inviteEmails, setInviteEmails] = useState('');
  const [newEvent, setNewEvent] = useState({ title: '', description: '', event_date: '', event_url: '' });
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', is_pinned: false });

  const { data: institutions = [], isLoading: institutionsLoading } = useAllInstitutions();
  const { data: stats } = useInstitutionStats(selectedInstitution?.id);

  // Fetch students for selected institution
  const { data: students = [] } = useQuery({
    queryKey: ['institution-students', selectedInstitution?.id],
    queryFn: async () => {
      if (!selectedInstitution) return [];
      const { data, error } = await supabase
        .from('institution_students')
        .select('*')
        .eq('institution_id', selectedInstitution.id)
        .order('invited_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedInstitution,
  });

  // Fetch events for selected institution
  const { data: events = [] } = useQuery({
    queryKey: ['admin-institution-events', selectedInstitution?.id],
    queryFn: async () => {
      if (!selectedInstitution) return [];
      const { data, error } = await supabase
        .from('institution_events')
        .select('*')
        .eq('institution_id', selectedInstitution.id)
        .order('event_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedInstitution,
  });

  // Fetch announcements for selected institution
  const { data: announcements = [] } = useQuery({
    queryKey: ['admin-institution-announcements', selectedInstitution?.id],
    queryFn: async () => {
      if (!selectedInstitution) return [];
      const { data, error } = await supabase
        .from('institution_announcements')
        .select('*')
        .eq('institution_id', selectedInstitution.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedInstitution,
  });

  // Create institution mutation
  const createInstitutionMutation = useMutation({
    mutationFn: async (data: typeof newInstitution) => {
      const { error } = await supabase.from('institutions').insert({
        name: data.name,
        slug: data.slug.toLowerCase().replace(/\s+/g, '-'),
        email_domain: data.email_domain || null,
        description: data.description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-institutions'] });
      setIsCreateDialogOpen(false);
      setNewInstitution({ name: '', slug: '', email_domain: '', description: '' });
      toast.success('Institution created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create institution');
    },
  });

  // Invite students mutation
  const inviteStudentsMutation = useMutation({
    mutationFn: async (emails: string[]) => {
      const { data, error } = await supabase.functions.invoke('send-institution-invitation', {
        body: { 
          institutionId: selectedInstitution!.id,
          emails,
          institutionName: selectedInstitution!.name,
          institutionSlug: selectedInstitution!.slug
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['institution-students'] });
      setIsInviteDialogOpen(false);
      setInviteEmails('');
      toast.success(`Invitations sent to ${data?.sent || 0} students`);
    },
    onError: () => toast.error('Failed to send invitations'),
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (data: typeof newEvent) => {
      const { error } = await supabase.from('institution_events').insert({
        institution_id: selectedInstitution!.id,
        title: data.title,
        description: data.description || null,
        event_date: data.event_date || null,
        event_url: data.event_url || null,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-institution-events'] });
      setIsEventDialogOpen(false);
      setNewEvent({ title: '', description: '', event_date: '', event_url: '' });
      toast.success('Event created successfully');
    },
    onError: () => toast.error('Failed to create event'),
  });

  // Create announcement mutation
  const createAnnouncementMutation = useMutation({
    mutationFn: async (data: typeof newAnnouncement) => {
      const { error } = await supabase.from('institution_announcements').insert({
        institution_id: selectedInstitution!.id,
        title: data.title,
        content: data.content,
        is_pinned: data.is_pinned,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-institution-announcements'] });
      setIsAnnouncementDialogOpen(false);
      setNewAnnouncement({ title: '', content: '', is_pinned: false });
      toast.success('Announcement created successfully');
    },
    onError: () => toast.error('Failed to create announcement'),
  });

  // Revoke access mutation
  const revokeAccessMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await supabase
        .from('institution_students')
        .update({ status: 'revoked' })
        .eq('id', studentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institution-students'] });
      toast.success('Access revoked');
    },
    onError: () => toast.error('Failed to revoke access'),
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.from('institution_events').delete().eq('id', eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-institution-events'] });
      toast.success('Event deleted');
    },
    onError: () => toast.error('Failed to delete event'),
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageBreadcrumb items={[
        { label: "Admin", href: "/admin" },
        { label: "Institutions" }
      ]} />

      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Institution Management</h1>
                <p className="text-muted-foreground">Manage partner educational institutions and their career centres</p>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Institution
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Institution</DialogTitle>
                    <DialogDescription>Add a new partner educational institution</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Institution Name *</Label>
                      <Input
                        value={newInstitution.name}
                        onChange={(e) => setNewInstitution(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., University of Lagos"
                      />
                    </div>
                    <div>
                      <Label>URL Slug *</Label>
                      <Input
                        value={newInstitution.slug}
                        onChange={(e) => setNewInstitution(prev => ({ ...prev, slug: e.target.value }))}
                        placeholder="e.g., unilag"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Career centre will be at /career-centre/{newInstitution.slug || 'slug'}
                      </p>
                    </div>
                    <div>
                      <Label>Email Domain (Optional)</Label>
                      <Input
                        value={newInstitution.email_domain}
                        onChange={(e) => setNewInstitution(prev => ({ ...prev, email_domain: e.target.value }))}
                        placeholder="e.g., unilag.edu.ng"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Students with this email domain can auto-verify
                      </p>
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={newInstitution.description}
                        onChange={(e) => setNewInstitution(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Brief description of the institution..."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                    <Button
                      onClick={() => createInstitutionMutation.mutate(newInstitution)}
                      disabled={!newInstitution.name || !newInstitution.slug || createInstitutionMutation.isPending}
                    >
                      {createInstitutionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Institution List */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Institutions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {institutionsLoading ? (
                    <div className="p-4 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </div>
                  ) : institutions.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No institutions yet
                    </div>
                  ) : (
                    <div className="divide-y">
                      {institutions.map(inst => (
                        <button
                          key={inst.id}
                          onClick={() => setSelectedInstitution(inst)}
                          className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                            selectedInstitution?.id === inst.id ? 'bg-muted' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {inst.logo_url ? (
                              <img src={inst.logo_url} alt="" className="h-10 w-10 object-contain rounded" />
                            ) : (
                              <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-primary" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-foreground">{inst.name}</p>
                              <p className="text-xs text-muted-foreground">/{inst.slug}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Institution Details */}
              <div className="lg:col-span-2">
                {!selectedInstitution ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Select an institution to manage</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>{selectedInstitution.name}</CardTitle>
                          <CardDescription>
                            <Link 
                              to={`/career-centre/${selectedInstitution.slug}`}
                              className="text-primary hover:underline inline-flex items-center gap-1"
                            >
                              View Career Centre <ExternalLink className="h-3 w-3" />
                            </Link>
                          </CardDescription>
                        </div>
                        <Badge variant={selectedInstitution.is_active ? "default" : "secondary"}>
                          {selectedInstitution.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="mb-4">
                          <TabsTrigger value="overview">Overview</TabsTrigger>
                          <TabsTrigger value="students">Students</TabsTrigger>
                          <TabsTrigger value="events">Events</TabsTrigger>
                          <TabsTrigger value="announcements">Announcements</TabsTrigger>
                        </TabsList>

                        {/* Overview Tab */}
                        <TabsContent value="overview">
                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="p-4 rounded-lg bg-muted/50 text-center">
                              <div className="text-2xl font-bold">{stats?.totalStudents || 0}</div>
                              <div className="text-xs text-muted-foreground">Total Students</div>
                            </div>
                            <div className="p-4 rounded-lg bg-muted/50 text-center">
                              <div className="text-2xl font-bold">{stats?.totalEnrollments || 0}</div>
                              <div className="text-xs text-muted-foreground">Course Enrollments</div>
                            </div>
                            <div className="p-4 rounded-lg bg-muted/50 text-center">
                              <div className="text-2xl font-bold">{stats?.totalCertificates || 0}</div>
                              <div className="text-xs text-muted-foreground">Certificates Issued</div>
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
                        </TabsContent>

                        {/* Students Tab */}
                        <TabsContent value="students">
                          <div className="flex justify-end mb-4">
                            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                              <DialogTrigger asChild>
                                <Button size="sm" className="rounded-full">
                                  <Mail className="h-4 w-4 mr-2" />
                                  Invite Students
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Invite Students</DialogTitle>
                                  <DialogDescription>
                                    Enter email addresses (one per line) to invite students to {selectedInstitution.name}
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
                          </div>
                          
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Email</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Invited</TableHead>
                                <TableHead></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {students.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                                    No students invited yet
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
                                      {student.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground text-sm">
                                    {format(new Date(student.invited_at), 'MMM d, yyyy')}
                                  </TableCell>
                                  <TableCell>
                                    {student.status !== 'revoked' && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => revokeAccessMutation.mutate(student.id)}
                                        disabled={revokeAccessMutation.isPending}
                                      >
                                        <XCircle className="h-4 w-4 text-destructive" />
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TabsContent>

                        {/* Events Tab */}
                        <TabsContent value="events">
                          <div className="flex justify-end mb-4">
                            <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
                              <DialogTrigger asChild>
                                <Button size="sm" className="rounded-full">
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Event
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Create Event</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div>
                                    <Label>Title *</Label>
                                    <Input
                                      value={newEvent.title}
                                      onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                                    />
                                  </div>
                                  <div>
                                    <Label>Description</Label>
                                    <Textarea
                                      value={newEvent.description}
                                      onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                                    />
                                  </div>
                                  <div>
                                    <Label>Date</Label>
                                    <Input
                                      type="datetime-local"
                                      value={newEvent.event_date}
                                      onChange={(e) => setNewEvent(prev => ({ ...prev, event_date: e.target.value }))}
                                    />
                                  </div>
                                  <div>
                                    <Label>Event URL</Label>
                                    <Input
                                      value={newEvent.event_url}
                                      onChange={(e) => setNewEvent(prev => ({ ...prev, event_url: e.target.value }))}
                                      placeholder="https://..."
                                    />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setIsEventDialogOpen(false)}>Cancel</Button>
                                  <Button
                                    onClick={() => createEventMutation.mutate(newEvent)}
                                    disabled={!newEvent.title || createEventMutation.isPending}
                                  >
                                    {createEventMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Create
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>

                          <div className="space-y-3">
                            {events.length === 0 ? (
                              <p className="text-center text-muted-foreground py-8">No events yet</p>
                            ) : events.map(event => (
                              <div key={event.id} className="flex items-center justify-between p-3 rounded-lg border">
                                <div>
                                  <p className="font-medium">{event.title}</p>
                                  {event.event_date && (
                                    <p className="text-sm text-muted-foreground">
                                      {format(new Date(event.event_date), 'MMM d, yyyy HH:mm')}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteEventMutation.mutate(event.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </TabsContent>

                        {/* Announcements Tab */}
                        <TabsContent value="announcements">
                          <div className="flex justify-end mb-4">
                            <Dialog open={isAnnouncementDialogOpen} onOpenChange={setIsAnnouncementDialogOpen}>
                              <DialogTrigger asChild>
                                <Button size="sm" className="rounded-full">
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Announcement
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Create Announcement</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div>
                                    <Label>Title *</Label>
                                    <Input
                                      value={newAnnouncement.title}
                                      onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                                    />
                                  </div>
                                  <div>
                                    <Label>Content *</Label>
                                    <Textarea
                                      value={newAnnouncement.content}
                                      onChange={(e) => setNewAnnouncement(prev => ({ ...prev, content: e.target.value }))}
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      id="is_pinned"
                                      checked={newAnnouncement.is_pinned}
                                      onChange={(e) => setNewAnnouncement(prev => ({ ...prev, is_pinned: e.target.checked }))}
                                    />
                                    <Label htmlFor="is_pinned">Pin to top</Label>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setIsAnnouncementDialogOpen(false)}>Cancel</Button>
                                  <Button
                                    onClick={() => createAnnouncementMutation.mutate(newAnnouncement)}
                                    disabled={!newAnnouncement.title || !newAnnouncement.content || createAnnouncementMutation.isPending}
                                  >
                                    {createAnnouncementMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Create
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>

                          <div className="space-y-3">
                            {announcements.length === 0 ? (
                              <p className="text-center text-muted-foreground py-8">No announcements yet</p>
                            ) : announcements.map(ann => (
                              <div key={ann.id} className="p-3 rounded-lg border">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium">{ann.title}</p>
                                  {ann.is_pinned && <Badge variant="outline">Pinned</Badge>}
                                </div>
                                <p className="text-sm text-muted-foreground">{ann.content}</p>
                              </div>
                            ))}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AdminInstitutions;
