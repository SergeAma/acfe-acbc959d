import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Video, Loader2, CheckCircle, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';

interface MentorSessionBookingProps {
  mentorId: string;
  mentorName: string;
  isEmbedded?: boolean;
}

export const MentorSessionBooking = ({ mentorId, mentorName, isEmbedded = false }: MentorSessionBookingProps) => {
  const { session, user } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(true);
  const [priceCents, setPriceCents] = useState<number>(5000);
  const [enabled, setEnabled] = useState<boolean>(true);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (searchParams.get('session_purchased') === 'true') {
      setShowSuccess(true);
      // Clear the URL param
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams]);

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

  const handleBookSession = async () => {
    if (!session?.access_token) {
      toast.error('Please log in to book a session');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-session-checkout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          mentorId,
          mentorName,
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
                {mentorName} will reach out to you shortly to schedule your 1:1 session.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // When embedded in collapsible, only show the content without card wrapper
  if (isEmbedded) {
    return (
      <CardContent className="space-y-4 pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Session Price</span>
          </div>
          {priceLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <span className="text-2xl font-bold text-primary">
              ${(priceCents / 100).toFixed(0)}
            </span>
          )}
        </div>

        <ul className="text-sm text-muted-foreground space-y-1.5">
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
            Direct access to the mentor
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
            Personalized career advice
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
            Resume/portfolio review available
          </li>
        </ul>

        <Button 
          onClick={handleBookSession} 
          className="w-full"
          disabled={loading || priceLoading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Video className="h-4 w-4 mr-2" />
          )}
          Book Session – ${(priceCents / 100).toFixed(0)}
        </Button>
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Session Price</span>
          </div>
          {priceLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <span className="text-2xl font-bold text-primary">
              ${(priceCents / 100).toFixed(0)}
            </span>
          )}
        </div>

        <ul className="text-sm text-muted-foreground space-y-1.5">
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
            Direct access to the mentor
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
            Personalized career advice
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
            Resume/portfolio review available
          </li>
        </ul>

        <Button 
          onClick={handleBookSession} 
          className="w-full"
          disabled={loading || priceLoading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Video className="h-4 w-4 mr-2" />
          )}
          Book Session – ${(priceCents / 100).toFixed(0)}
        </Button>
      </CardContent>
    </Card>
  );
};
