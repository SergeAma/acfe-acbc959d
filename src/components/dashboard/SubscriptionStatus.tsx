import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Settings, Calendar, AlertCircle, Loader2, Pause, Play } from 'lucide-react';
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
  pause_collection?: {
    behavior: string;
    resumes_at?: number;
  } | null;
}

interface SubscriptionData {
  subscribed: boolean;
  subscriptions: Subscription[];
}

export const SubscriptionStatus = () => {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);

  const fetchSubscription = async () => {
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

  useEffect(() => {
    fetchSubscription();
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

  const handlePauseSubscription = async (subscriptionId: string) => {
    if (!session?.access_token) {
      toast.error('Please log in to pause your subscription');
      return;
    }

    setActionLoading(subscriptionId);
    try {
      const { data, error } = await supabase.functions.invoke('manage-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          action: 'pause',
          subscriptionId,
        },
      });

      if (error) {
        toast.error(error.message || 'Failed to pause subscription');
        return;
      }

      toast.success('Subscription paused successfully');
      await fetchSubscription();
    } catch (err) {
      toast.error('Failed to pause subscription');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResumeSubscription = async (subscriptionId: string) => {
    if (!session?.access_token) {
      toast.error('Please log in to resume your subscription');
      return;
    }

    setActionLoading(subscriptionId);
    try {
      const { data, error } = await supabase.functions.invoke('manage-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          action: 'resume',
          subscriptionId,
        },
      });

      if (error) {
        toast.error(error.message || 'Failed to resume subscription');
        return;
      }

      toast.success('Subscription resumed successfully');
      await fetchSubscription();
    } catch (err) {
      toast.error('Failed to resume subscription');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (subscription: Subscription) => {
    if (subscription.status === 'paused') {
      return <Badge variant="secondary">Paused</Badge>;
    }
    if (subscription.cancel_at_period_end) {
      return <Badge variant="secondary">Canceling</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  const getStatusBanner = (subscription: Subscription) => {
    if (subscription.status === 'paused') {
      return (
        <div className="absolute top-0 left-0 right-0 bg-muted px-4 py-2 text-sm flex items-center gap-2">
          <Pause className="h-4 w-4" />
          Subscription paused
          {subscription.pause_collection?.resumes_at && (
            <span> - Resumes {new Date(subscription.pause_collection.resumes_at * 1000).toLocaleDateString()}</span>
          )}
        </div>
      );
    }
    if (subscription.cancel_at_period_end) {
      return (
        <div className="absolute top-0 left-0 right-0 bg-destructive/10 text-destructive px-4 py-2 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Cancels at end of billing period
        </div>
      );
    }
    return null;
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

  if (!subscriptionData || subscriptionData.subscriptions.length === 0) {
    return null;
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
            {getStatusBanner(subscription)}
            
            <CardHeader className={subscription.cancel_at_period_end || subscription.status === 'paused' ? 'pt-12' : ''}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{subscription.product_name}</CardTitle>
                {getStatusBadge(subscription)}
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
                  {subscription.status === 'paused' 
                    ? 'Paused since' 
                    : subscription.cancel_at_period_end 
                      ? 'Access until' 
                      : 'Renews on'}
                </span>
                <span className="font-medium">
                  {new Date(subscription.current_period_end).toLocaleDateString()}
                </span>
              </div>

              <div className="flex gap-2">
                {subscription.status === 'active' && !subscription.cancel_at_period_end && (
                  <Button 
                    onClick={() => handlePauseSubscription(subscription.id)} 
                    variant="outline" 
                    className="flex-1"
                    disabled={actionLoading === subscription.id}
                  >
                    {actionLoading === subscription.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Pause className="h-4 w-4 mr-2" />
                    )}
                    Pause
                  </Button>
                )}
                
                {subscription.status === 'paused' && (
                  <Button 
                    onClick={() => handleResumeSubscription(subscription.id)} 
                    variant="default" 
                    className="flex-1"
                    disabled={actionLoading === subscription.id}
                  >
                    {actionLoading === subscription.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Resume
                  </Button>
                )}
                
                <Button 
                  onClick={handleManageSubscription} 
                  variant="outline" 
                  className="flex-1"
                  disabled={portalLoading}
                >
                  {portalLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Settings className="h-4 w-4 mr-2" />
                  )}
                  Manage
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
