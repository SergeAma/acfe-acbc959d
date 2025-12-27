import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Settings, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Subscription {
  id: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_end: string;
  product_id: string;
  product_name: string;
  price_id: string;
  amount: number;
  currency: string;
  interval: string;
}

interface SubscriptionData {
  subscribed: boolean;
  subscriptions: Subscription[];
}

export const SubscriptionStatus = () => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!session?.access_token) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('check-subscription', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) {
          console.error('Error checking subscription:', error);
        } else {
          setSubscriptionData(data);
        }
      } catch (err) {
        console.error('Failed to check subscription:', err);
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [session]);

  const handleManageSubscription = async () => {
    if (!session?.access_token) {
      toast.error('Please log in to manage your subscription');
      return;
    }

    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        toast.error(error.message || 'Failed to open subscription portal');
        return;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      toast.error('Failed to open subscription portal');
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!subscriptionData?.subscribed || subscriptionData.subscriptions.length === 0) {
    return null; // Don't show anything if no subscription
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <CreditCard className="h-6 w-6" />
        My Subscriptions
      </h2>
      
      <div className="grid gap-4 md:grid-cols-2">
        {subscriptionData.subscriptions.map((subscription) => (
          <Card key={subscription.id} className="relative overflow-hidden">
            {subscription.cancel_at_period_end && (
              <div className="absolute top-0 left-0 right-0 bg-destructive/10 text-destructive px-4 py-2 text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Cancels at end of billing period
              </div>
            )}
            
            <CardHeader className={subscription.cancel_at_period_end ? 'pt-12' : ''}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{subscription.product_name}</CardTitle>
                <Badge variant={subscription.cancel_at_period_end ? 'secondary' : 'default'}>
                  {subscription.cancel_at_period_end ? 'Canceling' : 'Active'}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Price</span>
                <span className="font-medium">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: subscription.currency.toUpperCase(),
                  }).format(subscription.amount / 100)}
                  /{subscription.interval}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {subscription.cancel_at_period_end ? 'Access until' : 'Renews on'}
                </span>
                <span className="font-medium">
                  {new Date(subscription.current_period_end).toLocaleDateString()}
                </span>
              </div>
              
              <Button 
                onClick={handleManageSubscription} 
                variant="outline" 
                className="w-full"
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Settings className="h-4 w-4 mr-2" />
                )}
                Manage Subscription
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
