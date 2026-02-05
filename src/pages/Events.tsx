import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Calendar, MapPin, Video, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';

interface Event {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  event_date: string;
  event_time: string;
  event_type: 'online' | 'in_person';
  location_name: string | null;
  featured_image_url: string | null;
}

export const Events = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('id, title, slug, description, event_date, event_time, event_type, location_name, featured_image_url')
      .eq('status', 'published')
      .order('event_date', { ascending: true });

    if (!error && data) {
      setEvents(data as Event[]);
    }
    setLoading(false);
  };

  const upcomingEvents = events.filter(e => !isPast(new Date(e.event_date)) || isToday(new Date(e.event_date)));
  const pastEvents = events.filter(e => isPast(new Date(e.event_date)) && !isToday(new Date(e.event_date)));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero */}
        <section className="py-12 md:py-20 bg-gradient-to-b from-secondary/5 via-primary/5 to-background">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 text-secondary mb-6">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Community Events</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Connect, Learn, Grow Together
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join our networking sessions, workshops, and meetups designed to help you build meaningful connections and advance your career.
            </p>
          </div>
        </section>

        {/* Events List */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4 max-w-5xl">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-2xl font-semibold mb-2">No upcoming events</h2>
                <p className="text-muted-foreground mb-6">Check back soon for new events!</p>
                <Button asChild variant="outline">
                  <Link to="/">Return Home</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-12">
                {/* Upcoming Events */}
                {upcomingEvents.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-semibold mb-6">Upcoming Events</h2>
                    <div className="grid gap-6">
                      {upcomingEvents.map((event) => (
                        <EventCard key={event.id} event={event} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Past Events */}
                {pastEvents.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-semibold mb-6 text-muted-foreground">Past Events</h2>
                    <div className="grid gap-4 opacity-75">
                      {pastEvents.slice(0, 5).map((event) => (
                        <EventCard key={event.id} event={event} isPast />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

const EventCard = ({ event, isPast = false }: { event: Event; isPast?: boolean }) => {
  const eventDate = new Date(event.event_date);
  
  // Strip HTML tags for preview text
  const getPlainText = (html: string | null) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').substring(0, 120);
  };
  
  return (
    <Link to={`/events/${event.slug}`}>
      <Card className={`group overflow-hidden hover:shadow-xl transition-all duration-300 ${isPast ? 'hover:opacity-100' : 'hover:-translate-y-1'}`}>
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row">
            {/* Thumbnail */}
            <div className="sm:w-72 flex-shrink-0">
              <AspectRatio ratio={16/9} className="bg-muted">
                {event.featured_image_url ? (
                  <img 
                    src={event.featured_image_url} 
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-secondary/20 to-primary/10 flex items-center justify-center">
                    <Sparkles className="h-10 w-10 text-secondary/50" />
                  </div>
                )}
              </AspectRatio>
            </div>
            
            {/* Content */}
            <div className="flex-1 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant="outline" className="text-xs font-medium">
                    {format(eventDate, 'MMM d, yyyy')}
                  </Badge>
                  {isToday(eventDate) && (
                    <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 text-xs">Today!</Badge>
                  )}
                  {isPast && <Badge variant="secondary" className="text-xs">Past</Badge>}
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-secondary transition-colors line-clamp-2">
                  {event.title}
                </h3>
                {event.description && (
                  <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                    {getPlainText(event.description)}...
                  </p>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {event.event_time}
                  </span>
                  <span className="flex items-center gap-1">
                    {event.event_type === 'online' ? (
                      <><Video className="h-3.5 w-3.5" /> Online</>
                    ) : (
                      <><MapPin className="h-3.5 w-3.5" /> {event.location_name || 'In Person'}</>
                    )}
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-secondary group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default Events;
