import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { 
  Calendar, MapPin, Video, Clock, Users, ExternalLink, 
  CheckCircle, ArrowRight, Loader2, GraduationCap, BookOpen, LayoutDashboard,
  Linkedin
} from 'lucide-react';
import { format, isPast } from 'date-fns';
import { AddToCalendarButton } from '@/components/AddToCalendarButton';
import { sanitizeHtml } from '@/lib/sanitize-html';

interface Event {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  event_date: string;
  event_time: string;
  event_type: 'online' | 'in_person';
  event_link: string | null;
  location_name: string | null;
  location_address: string | null;
  featured_image_url: string | null;
  status: string;
}

interface Speaker {
  id: string;
  name: string;
  title: string | null;
  organization: string | null;
  bio: string | null;
  photo_url: string | null;
  linkedin_url: string | null;
}

interface EventMentor {
  id: string;
  mentor_id: string;
  profiles: {
    id: string;
    full_name: string;
    bio: string | null;
    avatar_url: string | null;
  } | null;
}

export const EventDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [eventMentors, setEventMentors] = useState<EventMentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registrationCount, setRegistrationCount] = useState(0);

  const justRegistered = searchParams.get('registered') === 'true';

  useEffect(() => {
    if (slug) {
      fetchEvent();
    }
  }, [slug]);

  useEffect(() => {
    if (event && user) {
      checkRegistration();
    }
  }, [event, user]);

  useEffect(() => {
    // Auto-register if user just signed up from this event page
    if (justRegistered && user && event && !isRegistered) {
      handleRegister();
    }
  }, [justRegistered, user, event, isRegistered]);

  const fetchEvent = async () => {
    setLoading(true);
    
    const { data: eventData, error } = await supabase
      .from('events')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (error || !eventData) {
      setLoading(false);
      return;
    }

    setEvent(eventData as Event);

    // Fetch speakers
    const { data: speakerData } = await supabase
      .from('event_speakers')
      .select('*')
      .eq('event_id', eventData.id)
      .order('sort_order');

    if (speakerData) {
      setSpeakers(speakerData as Speaker[]);
    }

    // Fetch event mentors with profile data
    const { data: mentorData, error: mentorError } = await supabase
      .from('event_mentors')
      .select('id, mentor_id, profiles(id, full_name, bio, avatar_url)')
      .eq('event_id', eventData.id)
      .order('sort_order');

    if (mentorError) {
      console.error('Error fetching event mentors:', mentorError);
    }

    if (mentorData) {
      setEventMentors(mentorData as EventMentor[]);
    }

    // Fetch registration count
    const { count } = await supabase
      .from('event_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventData.id);

    setRegistrationCount(count || 0);
    setLoading(false);
  };

  const checkRegistration = async () => {
    if (!event || !user) return;
    
    const { data } = await supabase
      .from('event_registrations')
      .select('id')
      .eq('event_id', event.id)
      .eq('user_id', user.id)
      .single();

    setIsRegistered(!!data);
  };

  const handleRegister = async () => {
    if (!event || !user) return;
    
    setRegistering(true);
    
    const { error } = await supabase
      .from('event_registrations')
      .insert({
        event_id: event.id,
        user_id: user.id,
      });

    if (error) {
      if (error.code === '23505') {
        // Already registered
        setIsRegistered(true);
      } else {
        toast({ 
          title: 'Registration failed', 
          description: error.message, 
          variant: 'destructive' 
        });
      }
    } else {
      setIsRegistered(true);
      setRegistrationCount(prev => prev + 1);
      toast({ 
        title: "You're registered! 🎉", 
        description: 'Check your email for confirmation details.' 
      });
      
      // Trigger confirmation email
      try {
        await supabase.functions.invoke('send-event-confirmation', {
          body: { 
            event_id: event.id, 
            user_id: user.id 
          }
        });
      } catch (e) {
        // Email sending is best-effort
      }
    }
    
    setRegistering(false);
  };

  const handleSignupToAttend = () => {
    // Redirect to auth with event context
    navigate(`/auth?redirect=/events/${slug}?registered=true&event=${slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
            <p className="text-muted-foreground mb-6">This event may have ended or been removed.</p>
            <Button asChild>
              <Link to="/events">View All Events</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const eventDate = new Date(event.event_date);
  const eventPassed = isPast(eventDate);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {/* Registration Success Banner */}
        {isRegistered && (
          <div className="bg-green-500/10 border-b border-green-500/20">
            <div className="container mx-auto px-4 py-4 max-w-5xl">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                <div>
                  <p className="font-medium text-green-700 dark:text-green-300">You're registered!</p>
                  <p className="text-sm text-green-600/80 dark:text-green-400/80">
                    A confirmation email has been sent to your inbox.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <section className="py-12 md:py-20 bg-gradient-to-b from-secondary/5 to-background">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2">
                <Badge variant="outline" className="mb-4">
                  {event.event_type === 'online' ? 'Online Event' : 'In-Person Event'}
                </Badge>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
                  {event.title}
                </h1>
                
                {/* Event Meta */}
                <div className="flex flex-wrap gap-6 mb-8">
                  <div className="flex items-center gap-2 text-lg">
                    <Calendar className="h-5 w-5 text-secondary" />
                    <span>{format(eventDate, 'EEEE, MMMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-lg">
                    <Clock className="h-5 w-5 text-secondary" />
                    <span>{event.event_time}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-muted-foreground mb-8">
                  {event.event_type === 'online' ? (
                    <><Video className="h-5 w-5" /> Online via video call</>
                  ) : (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-5 w-5 mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground">{event.location_name}</p>
                        {event.location_address && (
                          <p className="text-sm">{event.location_address}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-5 w-5" />
                  <span>{registrationCount} people registered</span>
                </div>
              </div>

              {/* Registration Card */}
              <div className="lg:col-span-1">
                <Card className="sticky top-24 border-2">
                  <CardContent className="p-6">
                    {eventPassed ? (
                      <div className="text-center py-4">
                        <Badge variant="secondary" className="mb-3">Event Ended</Badge>
                        <p className="text-muted-foreground text-sm">This event has already taken place.</p>
                      </div>
                    ) : isRegistered ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-medium">You're attending!</span>
                        </div>
                        <AddToCalendarButton
                          event={{
                            title: event.title,
                            description: event.description || '',
                            startDate: event.event_date,
                            startTime: event.event_time,
                            endTime: (() => {
                              // Add 2 hours to start time for end time
                              const [hours, mins] = event.event_time.split(':').map(Number);
                              const endHour = (hours + 2) % 24;
                              return `${endHour.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
                            })(),
                            timezone: 'Africa/Johannesburg',
                            location: event.event_type === 'online' ? event.event_link || 'Online' : event.location_name || '',
                          }}
                        />
                        {event.event_type === 'online' && event.event_link && (
                          <Button asChild variant="outline" className="w-full">
                            <a href={event.event_link} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Join Event
                            </a>
                          </Button>
                        )}
                      </div>
                    ) : user ? (
                      <Button 
                        onClick={handleRegister} 
                        disabled={registering}
                        className="w-full h-12 text-lg"
                      >
                        {registering ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          'Register to Attend'
                        )}
                      </Button>
                    ) : (
                      <div className="space-y-4">
                        <Button 
                          onClick={handleSignupToAttend}
                          className="w-full h-12 text-lg"
                        >
                          Create Account to Attend
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                          Free account • No credit card required
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Description with Mentor Sidebar */}
        {(event.description || eventMentors.length > 0) && (
          <section className="py-12 border-t">
            <div className="container mx-auto px-4 max-w-5xl">
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Main Description */}
                <div className="lg:col-span-2">
                  {event.description && (
                    <>
                      <h2 className="text-2xl font-semibold mb-6">About This Event</h2>
                      <div 
                        className="prose prose-lg dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(event.description) }}
                      />
                    </>
                  )}
                </div>

                {/* Mentor Sidebar */}
                {eventMentors.length > 0 && (
                  <div className="lg:col-span-1">
                    <div className="sticky top-24">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-secondary" />
                        Meet Your Mentors
                      </h3>
                      <div className="space-y-4">
                        {eventMentors.map((em) => (
                          <Link 
                            key={em.id} 
                            to={`/mentors/${em.mentor_id}`}
                            className="block"
                          >
                            <Card className="group hover:shadow-lg transition-all hover:-translate-y-0.5">
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <Avatar className="h-12 w-12 flex-shrink-0">
                                    {em.profiles?.avatar_url ? (
                                      <AvatarImage src={em.profiles.avatar_url} alt={em.profiles.full_name || 'Mentor'} />
                                    ) : null}
                                    <AvatarFallback className="bg-secondary/10 text-secondary">
                                      {em.profiles?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium group-hover:text-secondary transition-colors">
                                      {em.profiles?.full_name || 'ACFE Mentor'}
                                    </p>
                                    {em.profiles?.bio && (
                                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                        {em.profiles.bio}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-4 text-center">
                        Click to view full profile
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Speakers */}
        {speakers.length > 0 && (
          <section className="py-12 border-t bg-muted/30">
            <div className="container mx-auto px-4 max-w-5xl">
              <h2 className="text-2xl font-semibold mb-8">Featured Speakers</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {speakers.map((speaker) => (
                  <Card key={speaker.id} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-16 w-16">
                          {speaker.photo_url ? (
                            <AvatarImage src={speaker.photo_url} alt={speaker.name} />
                          ) : null}
                          <AvatarFallback className="text-lg">
                            {speaker.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold">{speaker.name}</h3>
                          {speaker.title && (
                            <p className="text-sm text-muted-foreground">{speaker.title}</p>
                          )}
                          {speaker.organization && (
                            <p className="text-sm text-secondary">{speaker.organization}</p>
                          )}
                        </div>
                      </div>
                      {speaker.bio && (
                        <p className="text-sm text-muted-foreground mt-4 line-clamp-3">
                          {speaker.bio}
                        </p>
                      )}
                      {speaker.linkedin_url && (
                        <a 
                          href={speaker.linkedin_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-secondary hover:underline mt-3"
                        >
                          <Linkedin className="h-4 w-4" />
                          LinkedIn
                        </a>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Cross-sell Section (only for registered users) */}
        {isRegistered && (
          <section className="py-12 border-t">
            <div className="container mx-auto px-4 max-w-5xl">
              <h2 className="text-2xl font-semibold mb-6">While You Wait...</h2>
              <p className="text-muted-foreground mb-8">Explore more of what ACFE has to offer</p>
              
              <div className="grid sm:grid-cols-3 gap-6">
                <Card className="group hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer" onClick={() => navigate('/courses')}>
                  <CardContent className="p-6">
                    <div className="p-3 rounded-xl bg-secondary/10 w-fit mb-4 group-hover:bg-secondary/20 transition-colors">
                      <BookOpen className="h-6 w-6 text-secondary" />
                    </div>
                    <h3 className="font-semibold mb-2">Explore Courses</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Free courses designed to accelerate your tech career.
                    </p>
                    <span className="inline-flex items-center text-sm text-secondary group-hover:gap-2 transition-all">
                      Browse Catalog <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </CardContent>
                </Card>

                <Card className="group hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer" onClick={() => navigate('/mentors')}>
                  <CardContent className="p-6">
                    <div className="p-3 rounded-xl bg-purple-500/10 w-fit mb-4 group-hover:bg-purple-500/20 transition-colors">
                      <GraduationCap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="font-semibold mb-2">Meet Our Mentors</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Connect with industry experts who can guide your journey.
                    </p>
                    <span className="inline-flex items-center text-sm text-purple-600 dark:text-purple-400 group-hover:gap-2 transition-all">
                      View Mentors <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </CardContent>
                </Card>

                <Card className="group hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer" onClick={() => navigate('/dashboard')}>
                  <CardContent className="p-6">
                    <div className="p-3 rounded-xl bg-blue-500/10 w-fit mb-4 group-hover:bg-blue-500/20 transition-colors">
                      <LayoutDashboard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="font-semibold mb-2">Your Dashboard</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Track your progress and manage your learning journey.
                    </p>
                    <span className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 group-hover:gap-2 transition-all">
                      Go to Dashboard <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default EventDetail;
