import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Video, Loader2, CheckCircle, DollarSign, Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';

interface MentorSessionBookingProps {
  mentorId: string;
  mentorName: string;
  isEmbedded?: boolean;
}

interface AvailabilitySlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  timezone: string;
}

interface BookedSession {
  scheduled_date: string;
  start_time: string;
  end_time: string;
}

export const MentorSessionBooking = ({ mentorId, mentorName, isEmbedded = false }: MentorSessionBookingProps) => {
  const { session, user } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [priceCents, setPriceCents] = useState<number | null>(null);
  const [enabled, setEnabled] = useState<boolean>(true);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Scheduling state
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [bookedSessions, setBookedSessions] = useState<BookedSession[]>([]);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (searchParams.get('session_purchased') === 'true' && sessionId) {
      // Confirm the session payment
      confirmSession(sessionId);
      setShowSuccess(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams]);

  const confirmSession = async (sessionId: string) => {
    try {
      await supabase.functions.invoke('confirm-session-payment', {
        body: { sessionId },
      });
    } catch (err) {
      console.error('Error confirming session:', err);
    }
  };

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-session-price');
        if (!error && data) {
          setPriceCents(data.priceCents);
          setEnabled(data.enabled);
        }
      } catch (err) {
        console.error('Error fetching session price:', err);
      } finally {
        setPriceLoading(false);
      }
    };

    fetchPrice();
  }, []);

  useEffect(() => {
    fetchAvailability();
  }, [mentorId]);

  const fetchAvailability = async () => {
    setAvailabilityLoading(true);
    try {
      // Fetch mentor's availability slots
      const { data: slots, error: slotsError } = await supabase
        .from('mentor_availability')
        .select('*')
        .eq('mentor_id', mentorId)
        .eq('is_active', true);

      if (!slotsError && slots) {
        setAvailability(slots);
      }

      // Fetch already booked sessions for the next 30 days
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysLater = addDays(new Date(), 30).toISOString().split('T')[0];
      
      const { data: booked, error: bookedError } = await supabase
        .from('mentorship_sessions')
        .select('scheduled_date, start_time, end_time')
        .eq('mentor_id', mentorId)
        .in('status', ['pending', 'confirmed'])
        .gte('scheduled_date', today)
        .lte('scheduled_date', thirtyDaysLater);

      if (!bookedError && booked) {
        setBookedSessions(booked);
      }
    } catch (err) {
      console.error('Error fetching availability:', err);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const getWeekDays = () => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  };

  const getAvailableSlotsForDate = (date: Date) => {
    const dayOfWeek = date.getDay();
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Get availability slots for this day
    const daySlots = availability.filter(slot => slot.day_of_week === dayOfWeek);
    
    // Filter out already booked slots
    return daySlots.filter(slot => {
      const isBooked = bookedSessions.some(
        booked => booked.scheduled_date === dateStr && 
                  booked.start_time.substring(0, 5) === slot.start_time.substring(0, 5)
      );
      return !isBooked;
    });
  };

  const handleBookSession = async () => {
    if (!session?.access_token) {
      toast.error('Please log in to book a session');
      return;
    }

    if (!selectedDate || !selectedSlot) {
      toast.error('Please select a time slot');
      return;
    }

    setLoading(true);
    try {
      const timezone = availability[0]?.timezone || 'UTC';
      
      const { data, error } = await supabase.functions.invoke('create-session-checkout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          mentorId,
          mentorName,
          scheduledDate: format(selectedDate, 'yyyy-MM-dd'),
          startTime: selectedSlot.start,
          endTime: selectedSlot.end,
          timezone,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to start checkout');
    } finally {
      setLoading(false);
    }
  };

  if (!enabled) {
    return null;
  }

  if (showSuccess) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="py-6">
          <div className="flex flex-col items-center text-center gap-3">
            <CheckCircle className="h-12 w-12 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-800">Session Booked Successfully!</h3>
              <p className="text-sm text-green-700 mt-1">
                {mentorName} will receive your booking and reach out with meeting details.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const weekDays = getWeekDays();
  const hasAvailability = availability.length > 0;

  const renderScheduler = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Session Price</span>
        </div>
        {priceLoading || priceCents === null ? (
          <span className="text-2xl font-bold text-muted-foreground/50 animate-pulse">$--</span>
        ) : (
          <span className="text-2xl font-bold text-primary">
            ${(priceCents / 100).toFixed(0)}
          </span>
        )}
      </div>

      {availabilityLoading ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !hasAvailability ? (
        <div className="text-center py-6 bg-muted/30 rounded-lg">
          <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {mentorName} hasn't set their availability yet.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Check back later or request mentorship to connect directly.
          </p>
        </div>
      ) : (
        <>
          {/* Week Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              disabled={weekStart <= startOfWeek(new Date(), { weekStartsOn: 1 })}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setWeekStart(addDays(weekStart, 7))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Date Selection */}
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((date) => {
              const slots = getAvailableSlotsForDate(date);
              const isAvailable = slots.length > 0;
              const isSelected = selectedDate && isSameDay(date, selectedDate);
              const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
              
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => {
                    if (isAvailable && !isPast) {
                      setSelectedDate(date);
                      setSelectedSlot(null);
                    }
                  }}
                  disabled={!isAvailable || isPast}
                  className={`
                    p-2 rounded-lg text-center transition-colors
                    ${isSelected ? 'bg-primary text-primary-foreground' : ''}
                    ${isAvailable && !isPast && !isSelected ? 'bg-muted/50 hover:bg-muted' : ''}
                    ${!isAvailable || isPast ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className="text-xs">{format(date, 'EEE')}</div>
                  <div className="text-lg font-medium">{format(date, 'd')}</div>
                  {isAvailable && !isPast && (
                    <div className="text-xs text-green-600">{slots.length} slot{slots.length !== 1 ? 's' : ''}</div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Time Slot Selection */}
          {selectedDate && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4" />
                Select a time for {format(selectedDate, 'EEEE, MMMM d')}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {getAvailableSlotsForDate(selectedDate).map((slot) => (
                  <Button
                    key={slot.id}
                    variant={selectedSlot?.start === slot.start_time.substring(0, 5) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedSlot({
                      start: slot.start_time.substring(0, 5),
                      end: slot.end_time.substring(0, 5),
                    })}
                    className="justify-center"
                  >
                    {slot.start_time.substring(0, 5)} - {slot.end_time.substring(0, 5)}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Button 
        onClick={handleBookSession} 
        className="w-full"
        disabled={loading || priceLoading || !selectedDate || !selectedSlot}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Video className="h-4 w-4 mr-2" />
        )}
        {selectedSlot 
          ? `Book ${format(selectedDate!, 'MMM d')} at ${selectedSlot.start} – ${priceCents !== null ? `$${(priceCents / 100).toFixed(0)}` : '--'}`
          : `Select a time slot – ${priceCents !== null ? `$${(priceCents / 100).toFixed(0)}` : '--'}`
        }
      </Button>
    </div>
  );

  // When embedded in collapsible, only show the content without card wrapper
  if (isEmbedded) {
    return (
      <CardContent className="space-y-4 pt-0">
        {renderScheduler()}
      </CardContent>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Video className="h-5 w-5 text-primary" />
          Book a 1:1 Session
        </CardTitle>
        <CardDescription>
          Get personalized guidance with a private mentorship session
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderScheduler()}
      </CardContent>
    </Card>
  );
};
