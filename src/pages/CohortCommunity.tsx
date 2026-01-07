import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Send, Loader2, ArrowLeft, Users } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

interface CohortMessage {
  id: string;
  mentor_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author_profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const CohortCommunity = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get the mentor ID (either user is mentor, or find their mentor)
  const { data: cohortInfo, isLoading: cohortLoading } = useQuery({
    queryKey: ['cohort-info', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Check if user is a mentor
      if (profile?.role === 'mentor') {
        return { mentorId: user.id, isMentor: true };
      }

      // Otherwise, find the mentor this user is a mentee of
      const { data, error } = await supabase
        .from('mentorship_requests')
        .select('mentor_id')
        .eq('student_id', user.id)
        .eq('status', 'accepted')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return { mentorId: data.mentor_id, isMentor: false };
    },
    enabled: !!user && !authLoading,
  });

  // Fetch cohort members
  const { data: cohortMembers } = useQuery({
    queryKey: ['cohort-members', cohortInfo?.mentorId],
    queryFn: async () => {
      if (!cohortInfo?.mentorId) return [];

      // Get mentor profile
      const { data: mentorProfile } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', cohortInfo.mentorId)
        .single();

      // Get accepted mentees
      const { data: requests } = await supabase
        .from('mentorship_requests')
        .select('student_id')
        .eq('mentor_id', cohortInfo.mentorId)
        .eq('status', 'accepted');

      const studentIds = requests?.map(r => r.student_id) || [];
      
      let menteeProfiles: any[] = [];
      if (studentIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', studentIds);
        menteeProfiles = data || [];
      }

      return [
        { ...mentorProfile, isMentor: true },
        ...menteeProfiles.map(p => ({ ...p, isMentor: false }))
      ];
    },
    enabled: !!cohortInfo?.mentorId,
  });

  // Fetch messages
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['cohort-messages', cohortInfo?.mentorId],
    queryFn: async () => {
      if (!cohortInfo?.mentorId) return [];

      const { data, error } = await supabase
        .from('cohort_messages')
        .select('*')
        .eq('mentor_id', cohortInfo.mentorId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch author profiles
      const authorIds = [...new Set(data.map(m => m.author_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', authorIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data.map(msg => ({
        ...msg,
        author_profile: profileMap.get(msg.author_id)
      })) as CohortMessage[];
    },
    enabled: !!cohortInfo?.mentorId,
  });

  // Set up realtime subscription
  useEffect(() => {
    if (!cohortInfo?.mentorId) return;

    const channel = supabase
      .channel('cohort-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cohort_messages',
          filter: `mentor_id=eq.${cohortInfo.mentorId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['cohort-messages', cohortInfo.mentorId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cohortInfo?.mentorId, queryClient]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !cohortInfo?.mentorId || !user) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('cohort_messages')
        .insert({
          mentor_id: cohortInfo.mentorId,
          author_id: user.id,
          content: newMessage.trim()
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error: any) {
      toast({
        title: 'Failed to send message',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  if (authLoading || cohortLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!cohortInfo) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-12">
          <Card className="max-w-md mx-auto">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">No Cohort Access</h2>
              <p className="text-muted-foreground mb-4">
                {profile?.role === 'mentor' 
                  ? "You'll see your cohort community here once you accept mentorship requests."
                  : "You need to be accepted into a mentor's cohort to access the community board."
                }
              </p>
              <Button onClick={() => navigate(profile?.role === 'mentor' ? '/mentor/cohort' : '/mentors')}>
                {profile?.role === 'mentor' ? 'Manage Cohort' : 'Find a Mentor'}
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <PageBreadcrumb 
        items={[
          { label: "Dashboard", href: "/dashboard" }, 
          ...(cohortInfo.isMentor ? [{ label: "My Cohort", href: "/mentor/cohort" }] : []),
          { label: "Community" }
        ]} 
      />
      
      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col max-h-[calc(100vh-200px)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {cohortInfo.isMentor && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/mentor/cohort')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Cohort
              </Button>
            )}
            <h1 className="text-2xl font-bold">Community Board</h1>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {cohortMembers?.length || 0} members
            </span>
          </div>
        </div>

        <div className="flex-1 grid lg:grid-cols-4 gap-6 min-h-0">
          {/* Messages Area */}
          <Card className="lg:col-span-3 flex flex-col min-h-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Discussion</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0 p-0">
              <ScrollArea className="flex-1 px-6">
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  <div className="space-y-4 py-4">
                    {messages?.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${message.author_id === user?.id ? 'flex-row-reverse' : ''}`}
                      >
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={message.author_profile?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {message.author_profile?.full_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`max-w-[70%] ${message.author_id === user?.id ? 'text-right' : ''}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                              {message.author_profile?.full_name || 'Anonymous'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(message.created_at), 'MMM d, h:mm a')}
                            </span>
                          </div>
                          <div
                            className={`rounded-lg px-4 py-2 ${
                              message.author_id === user?.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    rows={2}
                    className="resize-none"
                  />
                  <Button onClick={handleSendMessage} disabled={sending || !newMessage.trim()}>
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Members Sidebar */}
          <Card className="hidden lg:block">
            <CardHeader>
              <CardTitle className="text-lg">Members</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cohortMembers?.map((member) => (
                <div key={member.id} className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {member.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {member.full_name || 'Anonymous'}
                    </p>
                    {member.isMentor && (
                      <p className="text-xs text-primary">Mentor</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};
