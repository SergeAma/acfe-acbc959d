import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Video, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { format, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';

interface Event {
  id: string;
  title: string;
  slug: string;
  event_date: string;
  event_time: string;
  event_type: 'online' | 'in_person';
  location_name: string | null;
  featured_image_url: string | null;
}

interface EventRegistration {
  event_id: string;
}

export const UpcomingEventsSection = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [registeredEventIds, setRegisteredEventIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      // Fetch upcoming published events (next 30 days)
      const today = new Date().toISOString().split('T')[0];
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, title, slug, event_date, event_time, event_type, location_name, featured_image_url')
        .eq('status', 'published')
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .limit(3);

      if (eventsData) {
        setEvents(eventsData as Event[]);
      }

      // Fetch user's registrations if logged in
      if (user?.id) {
        const { data: registrations } = await supabase
          .from('event_registrations')
          .select('event_id')
          .eq('user_id', user.id);

        if (registrations) {
          setRegisteredEventIds(new Set(registrations.map(r => r.event_id)));
        }
      }

      setLoading(false);
    };

    fetchEvents();
  }, [user?.id]);

  if (loading || events.length === 0) {
    return null;
  }

  const getEventUrgencyBadge = (eventDate: string) => {
    const date = new Date(eventDate);
    if (isToday(date)) {
      return <Badge className="bg-destructive text-destructive-foreground animate-pulse">Today!</Badge>;
    }
    if (isTomorrow(date)) {
      return <Badge className="bg-secondary text-secondary-foreground">Tomorrow</Badge>;
    }
    const daysUntil = differenceInDays(date, new Date());
    if (daysUntil <= 7) {
      return <Badge variant="secondary">In {daysUntil} days</Badge>;
    }
    return null;
  };

  return (
    <Card className="border-2 border-secondary/30 bg-gradient-to-br from-secondary/5 via-primary/5 to-background overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-3 border-b border-secondary/20">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-secondary/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-secondary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Upcoming Events</h3>
              <p className="text-xs text-muted-foreground">Don't miss out!</p>
            </div>
          </div>
          <Link to="/events">
            <Button variant="ghost" size="sm" className="text-secondary hover:text-secondary">
              View All
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>

        {/* Events List */}
        <div className="divide-y divide-border/50">
          {events.map((event) => {
            const isRegistered = registeredEventIds.has(event.id);
            const eventDate = new Date(event.event_date);
            
            return (
              <Link 
                key={event.id} 
                to={`/events/${event.slug}`}
                className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors group"
              >
                {/* Thumbnail or Icon */}
                <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-secondary/20 to-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {event.featured_image_url ? (
                    <img 
                      src={event.featured_image_url} 
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Calendar className="h-6 w-6 text-secondary/70" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {getEventUrgencyBadge(event.event_date)}
                    {isRegistered && (
                      <Badge variant="outline" className="text-primary border-primary/50 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Registered
                      </Badge>
                    )}
                  </div>
                  <h4 className="font-medium text-sm line-clamp-1 group-hover:text-secondary transition-colors">
                    {event.title}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(eventDate, 'MMM d')} • {event.event_time?.substring(0, 5) || ''}
                    </span>
                    <span className="flex items-center gap-1">
                      {event.event_type === 'online' ? (
                        <><Video className="h-3 w-3" /> Online</>
                      ) : (
                        <><MapPin className="h-3 w-3" /> {event.location_name || 'In Person'}</>
                      )}
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-secondary group-hover:translate-x-1 transition-all flex-shrink-0" />
              </Link>
            );
          })}
        </div>

        {/* CTA Footer */}
        {events.length > 0 && (
          <div className="p-3 bg-muted/30 border-t border-border/50">
            <Link to="/events" className="block">
              <Button variant="secondary" size="sm" className="w-full">
                <Sparkles className="h-4 w-4 mr-2" />
                Explore All Events
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
