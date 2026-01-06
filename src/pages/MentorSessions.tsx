import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { MentorAvailabilitySettings } from '@/components/mentor/MentorAvailabilitySettings';
import { AddToCalendarButton } from '@/components/AddToCalendarButton';
import { ArrowLeft, Calendar, Clock, Video, User, Loader2, Mail, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useMentorContract } from '@/hooks/useMentorContract';

interface Session {
  id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  timezone: string;
  status: string;
  amount_cents: number;
  notes: string | null;
  meeting_link: string | null;
  created_at: string;
  student: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export const MentorSessions = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, isActualAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const { hasSignedContract, loading: contractLoading } = useMentorContract(user?.id);

  useEffect(() => {
    if (!authLoading && profile?.role !== 'mentor' && profile?.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [profile, authLoading, navigate]);

  // Redirect mentors who haven't signed contract
  useEffect(() => {
    if (!contractLoading && profile?.role === 'mentor' && !isActualAdmin && hasSignedContract === false) {
      navigate('/mentor-contract');
    }
  }, [contractLoading, profile, isActualAdmin, hasSignedContract, navigate]);

  useEffect(() => {
    if (profile?.id) {
      fetchSessions();
    }
  }, [profile?.id]);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('mentorship_sessions')
        .select(`
          *,
          student:profiles!mentorship_sessions_student_id_fkey(id, full_name, email, avatar_url)
        `)
        .eq('mentor_id', profile?.id)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setSessions(data || []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateSessionStatus = async (sessionId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('mentorship_sessions')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) throw error;
      toast.success(`Session ${status}`);
      fetchSessions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update session');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending Payment</Badge>;
      case 'completed':
        return <Badge variant="outline">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const upcomingSessions = sessions.filter(s => 
    s.status === 'confirmed' && new Date(s.scheduled_date) >= new Date(new Date().setHours(0, 0, 0, 0))
  );
  const pendingSessions = sessions.filter(s => s.status === 'pending');
  const pastSessions = sessions.filter(s => 
    s.status === 'completed' || s.status === 'cancelled' || 
    (s.status === 'confirmed' && new Date(s.scheduled_date) < new Date(new Date().setHours(0, 0, 0, 0)))
  );

  if (authLoading || loading || contractLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const renderSessionCard = (session: Session) => (
    <Card key={session.id} className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <ProfileAvatar
            src={session.student?.avatar_url || undefined}
            name={session.student?.full_name || undefined}
            size="md"
          />
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">{session.student?.full_name || 'Learner'}</h3>
              {getStatusBadge(session.status)}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(session.scheduled_date), 'EEE, MMM d, yyyy')}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {session.start_time.substring(0, 5)} - {session.end_time.substring(0, 5)}
              </span>
            </div>
            <a 
              href={`mailto:${session.student?.email}`}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <Mail className="h-3 w-3" />
              {session.student?.email}
            </a>
          </div>
          <div className="flex gap-2 flex-wrap">
            {session.status === 'confirmed' && (
              <>
                <AddToCalendarButton
                  event={{
                    title: `1:1 Session with ${session.student?.full_name || 'Learner'}`,
                    description: `Mentorship session with ${session.student?.full_name || 'Learner'}\n\nContact: ${session.student?.email || ''}`,
                    startDate: session.scheduled_date,
                    startTime: session.start_time.substring(0, 5),
                    endTime: session.end_time.substring(0, 5),
                    timezone: session.timezone,
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateSessionStatus(session.id, 'completed')}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Mark Complete
                </Button>
              </>
            )}
            {(session.status === 'confirmed' || session.status === 'pending') && (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => updateSessionStatus(session.id, 'cancelled')}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Video className="h-8 w-8" />
              1:1 Sessions
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your mentorship sessions and availability
            </p>
          </div>

          <Tabs defaultValue="sessions">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sessions">My Sessions</TabsTrigger>
              <TabsTrigger value="availability">Availability</TabsTrigger>
            </TabsList>

            <TabsContent value="sessions" className="space-y-6 mt-6">
              {/* Upcoming Sessions */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming Sessions ({upcomingSessions.length})
                </h2>
                {upcomingSessions.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No upcoming sessions</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {upcomingSessions.map(renderSessionCard)}
                  </div>
                )}
              </div>

              {/* Pending Sessions */}
              {pendingSessions.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Pending Payment ({pendingSessions.length})</h2>
                  <div className="space-y-3">
                    {pendingSessions.map(renderSessionCard)}
                  </div>
                </div>
              )}

              {/* Past Sessions */}
              {pastSessions.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold text-muted-foreground">
                    Past Sessions ({pastSessions.length})
                  </h2>
                  <div className="space-y-3 opacity-75">
                    {pastSessions.map(renderSessionCard)}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="availability" className="mt-6">
              <MentorAvailabilitySettings />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
